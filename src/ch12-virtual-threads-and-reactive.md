# 12. 虚拟线程与新并发：Java 21 Project Loom 对决 Swoole 协程

> “过去为了高并发，我们不得不把代码改写成晦涩的异步响应式；现在虚拟线程让我们重新享受同步代码的纯粹。”

长期以来，服务端高并发编程存在一个经典的**“鱼和熊掌不可兼得”**难题：
1. **传统线程模型（Thread-per-request）**：
   - 编写简单、逻辑直观、断点调试与异常堆栈清晰明了；
   - 但平台线程（Platform Thread）与操作系统内核线程 1:1 绑定，单个线程默认占用 1MB 栈内存，上下文切换开销巨大，单机最多只能维持数千个线程。
2. **响应式非阻塞模型（Reactive / Spring WebFlux / Swoole EventLoop）**：
   - 彻底解放吞吐，单机轻松抗住几万并发；
   - 但代价极其惨重：必须把所有的业务逻辑切碎，改写为复杂的链式回调（Mono/Flux/Callback）；传统的 `ThreadLocal`、事务切面失效，一旦发生异常，错误堆栈支离破碎，排查难度呈指数级飙升。

**Java 21 的虚拟线程（Virtual Threads，代号 Project Loom）彻底终结了这场长达数十年的妥协！**

---

## 1. 虚拟线程与 Swoole / Go 协程的异曲同工

对于写过 Swoole 或 Go 的开发者来说，虚拟线程的核心心智与**协程（Coroutine / Goroutine）**几乎完全一致：它们都是由用户态运行时管理的**轻量级线程**。

```mermaid
flowchart TD
    subgraph 传统平台线程 (1:1 模型)
        T1["Java 线程 1"] <--> K1["操作系统内核线程 1 (1MB 栈)"]
        T2["Java 线程 2"] <--> K2["操作系统内核线程 2 (1MB 栈)"]
        Note1["单机撑死几千个线程，否则 OOM"]
    end

    subgraph Java 21 虚拟线程 (M:N 调度模型)
        V1["虚拟线程 1"] --> C1["载体线程 (Carrier Thread 1)"]
        V2["虚拟线程 2"] --> C1
        V3["虚拟线程 3"] --> C2["载体线程 (Carrier Thread 2)"]
        V4["虚拟线程 ... (百万级)"] --> C2
        
        C1 <--> O1["内核线程 1 (CPU Core 1)"]
        C2 <--> O2["内核线程 2 (CPU Core 2)"]
    end
```

| 维度对比 | 传统平台线程 (Platform Thread) | Swoole 协程 (PHP) | Java 21 虚拟线程 (Virtual Thread) |
| :--- | :--- | :--- | :--- |
| **内存开销** | 默认 1MB 独立线程栈 | 数 KB ~ 数十 KB | **几百字节至数 KB**（按需动态伸缩） |
| **单机最大承载量** | 几千 | 数万至十万 | **数百万级** |
| **创建与销毁耗时** | 毫秒级，开销大，必须用线程池复用 | 微秒级 | **纳秒级**，用完即弃，**严禁池化**！ |
| **对阻塞 I/O 的处理** | 真实卡死物理线程 | 需 Hook 底层 PHP 函数 | **JVM 自动在底层卸载，代码无感** |
| **编程范式** | 同步阻塞（代码易懂） | 同步书写，底层协程切入切出 | **完全保持传统 Thread API 与同步风格！** |

---

## 2. 虚拟线程的底层自动挂起与恢复

当你在一行代码中调用了阻塞操作（比如执行了一句需要 20ms 的 MySQL 查询，或者发起了一个 HTTP 请求）：
1. 传统的平台线程会直接陷入睡眠，白白霸占宝贵的 CPU 核心；
2. **虚拟线程**在调用 JDK 内置的阻塞方法（Socket 读写、File I/O、`Thread.sleep`）时，JVM 底层会自动捕获阻塞事件：
   - 将当前虚拟线程的栈帧数据从物理线程（载体线程 Carrier Thread）中移出，存放到堆内存中；
   - 载体线程**毫不停歇，立刻去执行其他就绪的虚拟线程**；
   - 当操作系统通知网络数据到达时，调度器自动在某个空闲的载体线程上**恢复并继续执行该虚拟线程**！

这一切对你的业务代码来说都是**完全透明的**。你不需要写任何 `await`、不需要引入任何反应式包装类，照常编写最朴素的同步代码！

---

## 3. 极速上手：创建并运行虚拟线程

### 方式一：直接启动单个虚拟线程
```java
Thread vThread = Thread.startVirtualThread(() -> {
    System.out.println("运行在虚拟线程中: " + Thread.currentThread());
});
vThread.join();
```

### 方式二：为每个任务分配一个虚拟线程（生产标准用法）
```java
// 创建一个无需池化、每个任务独立起一个虚拟线程的 ExecutorService
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    // 瞬间提交 10,000 个任务！
    for (int i = 0; i < 10_000; i++) {
        final int taskId = i;
        executor.submit(() -> {
            // 模拟阻塞 I/O（休眠 1 秒）
            Thread.sleep(Duration.ofSeconds(1));
            return "Task " + taskId + " done";
        });
    }
} // try-with-resources 会自动等待这 1 万个任务全部完成
System.out.println("全部 1 万个并发任务瞬间处理完毕！");
```

### 方式三：Spring Boot 3.2+ 开启虚拟线程（只需一行配置！）
在 Spring Boot 3.2 及更高版本中，内置的 Tomcat / Jetty 已经原生支持虚拟线程。你只需要在 `application.yml` 中添加一行配置：

```yaml
spring:
  threads:
    virtual:
      enabled: true # 一键开启！所有 Web 请求全自动运行在虚拟线程上！
```
仅需这一行配置，你的 Spring Boot 应用在面对高并发 I/O 密集型接口时，吞吐量能轻松提升数倍以上，而业务代码一行都不需要改动！

---

## 4. 💣 核心避坑指南

### 1. 绝对不要对虚拟线程进行“池化”（Do NOT Pool Virtual Threads）
在传统 Java 中，创建线程代价高昂，所以必须用 `ThreadPoolExecutor` 限制最大并发数并复用线程。  
但虚拟线程极其廉价（用完即弃）。如果你给虚拟线程外面套一个线程池去限制它只能有 50 个，那就是“把高铁当绿皮车开”！

### 2. 警惕线程固定（Thread Pinning）陷阱
当虚拟线程正在执行以下代码时，它**无法从底层载体线程中卸载**，这被称为线程固定（Pinning）：
- 在 `synchronized` 代码块或方法内部执行阻塞 I/O；
- 调用了 JNI 本地 C 语言代码。

如果大量虚拟线程在 `synchronized` 内部阻塞，会导致载体线程被死死占满，高并发能力退化。

> [!TIP]
> **解决方案**：在涉及阻塞 I/O 的临界区，使用 `ReentrantLock` 替代 `synchronized`：
> ```java
> private final ReentrantLock lock = new ReentrantLock();
> 
> public void processWithLock() {
>     lock.lock();
>     try {
>         // 即使在这里执行了远程 HTTP 调用，虚拟线程依然可以被安全卸载！
>         remoteApiCall();
>     } finally {
>         lock.unlock();
>     }
> }
> ```

至此，第二部分 JVM 核心机制与并发体系已全面掌握。从下一章起，我们将跨入企业级架构的最高殿堂 —— **Spring Boot 3 实战、数据持久化与大型微服务生态治理**！
