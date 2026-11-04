# 10. 内存模型与 GC：从 zval 引用计数到 JVM 堆栈与垃圾收集器

> “在 PHP 中，内存泄露只是一个请求的恶作剧；在 Java 中，内存泄露是拖垮整台服务器的终极灾难。”

在传统的 PHP-FPM 开发中，许多开发者甚至从未真正关注过内存管理。即使你的代码写出了循环引用、无节制地将数据塞进全局数组，只要单次请求内存没超过 `php.ini` 中的 `memory_limit`（例如 128M），请求结束的瞬间，Zend 引擎就会把全部申请的内存一次性释放得干干净净。

但在 Java 中，JVM 进程长年累月驻留运行。如果某个对象不再被业务使用，却依然被全局根对象间接引用，垃圾收集器（GC）便**永远无法回收它**。随着内存被一点点蚕食，最终将触发系统崩溃的 `java.lang.OutOfMemoryError`（OOM）。

本章将带你深入 JVM 核心腹地，看清堆栈内存的每一个角落，掌握生产级 GC 调优与线上内存泄露排查利器。

---

## 1. 垃圾回收机制大对决：引用计数 vs 可达性分析

PHP Zend 引擎和 Python 一样，核心依赖**引用计数（Reference Counting）**：
- 每个 `zval` 结构体维护一个 `refcount` 计数器；
- 变量被赋值引用时 `+1`，销毁或超出作用域时 `-1`；
- 当计数器归零时立即就地释放内存。针对循环引用问题，PHP 5.3+ 引入了一个容量为 10,000 的循环根缓冲区（Cycle Collector Buffer）进行延迟扫描。

Java 绝不使用引用计数，而是使用更高级的 **可达性分析算法（Reachability Analysis）**：

```mermaid
flowchart TD
    subgraph GC Roots 根对象节点
        R1["线程栈本地变量 (Local Variables)"]
        R2["类静态变量 (Static Variables)"]
        R3["JNI 本地方法栈引用"]
    end

    R1 --> A["存活对象 A"]
    A --> B["存活对象 B"]
    R2 --> C["存活对象 C"]

    subgraph 垃圾孤岛 (可达性分析判定为不可达)
        D["孤立对象 D"] <--> E["孤立对象 E<br>(即使互相循环引用，也会被安全回收！)"]
    end
```

- **从“GC Roots”开始向下遍历**：凡是与 GC Roots 存在引用链的对象，判定为**存活对象**；
- **循环引用自动回收**：即使对象 D 和 E 彼此相互持有引用，但由于从任何 GC Roots 都无法走到它们，JVM 垃圾收集器依然会在下一轮 GC 中将其彻底回收。

---

## 2. JVM 运行时数据区全貌

```
+--------------------------------------------------------------------------+
|                               JVM 进程内存空间                              |
|                                                                          |
|   +------------------------------------------------------------------+   |
|   |                        JVM 堆 (Heap, 全线程共享)                   |   |
|   |                                                                  |   |
|   |   +------------------------------------+   +-----------------+   |   |
|   |   |        年轻代 (Young Gen)           |   |  老年代 (Old)   |   |   |
|   |   |  +---------+  +----+  +----+       |   |                 |   |   |
|   |   |  | Eden 区 |  | S0 |  | S1 |       |   |  长期存活的对象  |   |   |
|   |   |  +---------+  +----+  +----+       |   |                 |   |   |
|   |   +------------------------------------+   +-----------------+   |   |
|   +------------------------------------------------------------------+   |
|                                                                          |
|   +-----------------------------+     +------------------------------+   |
|   |  元空间 (Metaspace, 堆外物理内存) |     |  每个线程独占私有空间           |   |
|   |  • 类元信息 (Class Metadata)  |     |  • 线程栈 (Thread Stack)     |   |
|   |  • 运行时常量池               |     |  • 程序计数器 (PC Register)   |   |
|   +-----------------------------+     +------------------------------+   |
+--------------------------------------------------------------------------+
```

### 1. 堆（Heap - 核心重地）：
- 所有通过 `new` 创建的对象实例均分配在堆中；
- 分为**年轻代（Young Generation）**与**老年代（Old Generation）**：
  - **Eden 区**：绝大多数新对象在这里诞生；
  - **Survivor 区（S0 / S1）**：在 Minor GC 中存活下来的对象在两块 Survivor 区之间来回复制；
  - 经历过多次 GC（默认年龄阈值通常为 15 次）依然存活的对象，晋升至**老年代**。

### 2. 线程栈（Thread Stack）：
- 每个线程独占一块内存，随线程生命周期创建与销毁；
- 存储方法调用的栈帧（Stack Frame）、局部变量表、操作数栈；
- 如果递归过深或栈空间耗尽，将抛出著名的 `StackOverflowError`。

### 3. 元空间（Metaspace）：
- Java 8 彻底废弃了受限于堆内存大小的永久代（PermGen），改用直接使用本地物理内存的元空间；
- 存放类加载器载入的 Class 字节码结构、常量池、方法定义。

---

## 3. 主流垃圾收集器：从 G1 到超低延迟 ZGC

垃圾回收的核心指标是**吞吐量（Throughput）**与**停顿时间（STW, Stop-The-World）**。

| 收集器 | 诞生时期 | 核心机制 | 适用场景与停顿表现 |
| :--- | :--- | :--- | :--- |
| **CMS** | 远古经典 | 并发标记清除，分代回收 | Java 8 常用，存在内存碎片，已在 Java 14 正式移除 |
| **G1 (Garbage-First)** | Java 9+ 默认 | 将堆内存切分为数千个独立的 Region 分区，优先回收垃圾最多的区域 | 4G ~ 32G 大堆的主流首选，停顿时间可预测（通常数十毫秒） |
| **ZGC** | Java 15+ / 21 生产成熟 | 基于染色指针（Colored Pointers）与读屏障，并发标记与并发整理 | **现代企业级旗舰！** 管理高达 16TB 堆内存，**STW 停顿小于 1 毫秒**！ |

> [!TIP]
> **生产启动参数推荐（Java 21 分代 ZGC）**：
> 在 Java 21 中，启用全新的分代 ZGC（Generational ZGC），只需一行 JVM 启动参数：
> ```bash
> java -XX:+UseZGC -XX:+ZGenerational -Xms8g -Xmx8g -jar app.jar
> ```

---

## 4. 警惕！Java 常见的 3 大隐蔽内存泄漏根源

虽然有 GC 自动保驾护航，但以下代码依然会引发灾难性的内存泄漏：

### 1. 静态集合（Static Collections）无限膨胀
```java
public class CacheService {
    // ❌ 灾难：静态 Map 永远不会被 GC 回收！
    private static final Map<String, Object> LOCAL_CACHE = new HashMap<>();

    public void cacheUser(String token, Object data) {
        LOCAL_CACHE.put(token, data); // 随着用户量增加，堆内存迟早打爆 OOM！
    }
}
```
**解法**：绝不要使用普通 HashMap 做全局缓存，必须使用具备自动过期与 LRU 淘汰机制的高性能缓存库，如 **Caffeine**：
```java
Cache<String, Object> cache = Caffeine.newBuilder()
    .expireAfterWrite(10, TimeUnit.MINUTES)
    .maximumSize(10_000)
    .build();
```

### 2. ThreadLocal 忘记调用 `.remove()`
在 Spring Boot 线程池环境下，Web 工作线程会被不断复用。如果将数据存入 `ThreadLocal` 却未在请求结束时显式清理，对象将永久残留在线程内部的 `threadLocals` 表中，造成线程安全混乱与严重内存泄漏。

---

## 5. 线上实战利器：阿里开源 Arthas 极速诊断

Java 生态拥有全行业最顶级、无需停机的线上动态诊断利器 —— **[Arthas（阿尔萨斯）](https://arthas.aliyun.com/)**。

当生产环境出现 CPU 飙高、响应缓慢或怀疑内存溢出时，你无需重启应用，直接 Attach：

```bash
# 1. 一键下载并运行 Arthas
curl -O https://arthas.aliyun.com/arthas-boot.jar
java -jar arthas-boot.jar

# 2. 常用秒级排查命令：
dashboard           # 实时全屏看板：CPU、内存分代占用、线程数
thread -n 3         # 查看占用 CPU 最高的 Top 3 线程堆栈
jvm                 # 查看 JVM 内存结构、GC 次数与耗时
heapdump /tmp/dump.hprof # 动态抓取堆转储快照供分析
```

在下一章中，我们将迎来 Java 性能的核心引擎 —— **高并发、Java 内存模型（JMM）、线程池与同步锁**！
