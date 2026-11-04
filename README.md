# Java for PHP Programmers ☕ 🐘

> 面向 PHP 开发者的 Java 进阶指南：从动态弱类型到静态强类型，从 Shared-Nothing 到企业级高并发与微服务架构。

本项目专门为拥有 **PHP 8+ / Laravel / Symfony / ThinkPHP / Workerman / Webman / Swoole** 背景的工程师打造，帮助 PHP 开发者打破心智断层，系统掌握现代生产级 Java（Java 17/21+、Spring Boot 3、JVM 核心机制、高并发多线程与微服务治理），并学会设计高可用、企业级的混合分布式架构。

---

## 📖 核心目标与读者痛点

- **企业级规模跃迁**：解决大型分布式系统、海量数据吞吐、金融级一致性场景下 PHP 单体架构的承载瓶颈。
- **重塑内存与运行时心智**：从 PHP 的 Zend GC（引用计数与循环垃圾收集）无缝过渡到 JVM 内存布局（堆、元空间、线程栈）与现代低延迟垃圾收集器（G1、ZGC）。
- **常驻内存与真正高并发**：从 PHP-FPM 单请求隔离生命周期，进阶到 JVM 多线程共享内存模型（JMM）、线程池调度与 Java 21 虚拟线程（Project Loom）。
- **框架体系降维映射**：将熟悉的 Laravel IoC 容器、Eloquent ORM、中间件机制，精准映射到 Spring Boot 3 IoC/DI、AOP 切面代理、MyBatis-Plus / Spring Data JPA。
- **双剑合璧与平滑重构**：学会利用 gRPC、消息队列（RocketMQ/Kafka）与绞杀者模式（Strangler Fig Pattern），在保障现有业务不停机的前提下实现渐进式重构。

---

## 🗺️ 核心知识映射（Mental Model Bridge）

| 领域 / 概念 | PHP（PHP 8+） | Java（Java 17/21+） | 核心心智转换 |
| :--- | :--- | :--- | :--- |
| **执行模型** | 经典 Shared-Nothing，单请求隔离生命周期 | JVM 单一长期运行进程，多线程共享堆内存 | 告别“请求结束销毁一切”，必须严格管控全局共享变量与内存生命周期 |
| **类型系统** | 动态弱类型 + 渐进类型（Union Types / `mixed`） | 编译期强静态类型 + 局部类型推导（`var`） | 编译期严格检查，杜绝隐式类型转换与运行时未捕获类型错误 |
| **基本数据与包装** | 无包装概念，整型/浮点自动扩容 | 基本类型（`int`）与包装类型（`Integer`），自动装箱 | 区分栈上原始值与堆上对象引用，注意缓存池与空指针异常（NPE） |
| **空值与异常** | `null`、弱类型判断、运行时 `Throwable` | 强类型 `null`、受检异常（Checked Exception）、`Optional<T>` | 编译期强制显式捕获或向上抛出异常，使用 `Optional` 消除隐式 null |
| **核心数据容器** | 万能哈希数组 `array`（关联数组兼列表） | Java 集合框架（`List`、`Set`、`Map`、`Queue`） | 告别一个 Array 走天下，根据哈希碰撞、有序性与线程安全挑选专用集合 |
| **结构建模** | `class`、单继承、`trait` 水平复用、`interface` | `class`、接口多实现（带默认方法）、`record`、`sealed class` | 告别运行时代码混入，拥抱显式契约、数据载体（Record）与受限密封类 |
| **依赖与构建** | Composer (`composer.json` / Packagist / PSR-4) | Maven (`pom.xml`) / Gradle (`build.gradle`) / Maven Central | 引入生命周期构建阶段（编译/测试/打包）、多模块依赖解析与胖包（Fat JAR） |
| **并发与线程** | FPM 多进程 / Swoole 协程 / Redis 分布式锁 | JMM 原生多线程、线程池、`synchronized`/锁、Java 21 虚拟线程 | 告别 Redis 中转状态，利用 JVM 内存级并发原语与轻量级虚拟线程 |
| **元编程与控制反转** | 反射、魔术方法（`__call`/`__get`）、属性（Attribute） | 反射、动态代理（JDK/CGLIB）、注解（Annotation）、AOP 切面 | 告别运行时动态方法注入，拥抱编译期/启动期字节码增强与依赖注入 |
| **持久层架构** | Active Record 模式（Eloquent / ThinkORM） | Data Mapper 模式（MyBatis / MyBatis-Plus / JPA） | 领域模型与数据库访问层解耦，精细控制 SQL 与多级缓存 |

---

## 📚 目录路线图（Book Outline）

### 第一部分：语言基础与心智重塑（Part I: Mindset Shift & Syntax）
- **01. 动机与破局：为什么 PHP 开发者需要学习 Java？**
- **02. 工具链起步：从 Composer 到 Maven / Gradle 与 JDK 生态**
- **03. 类型系统蜕变：从动态弱类型到强类型、装箱与确定性**
- **04. 流程控制与现代语法：Pattern Matching、Record 与新特性**
- **05. 集合框架大起底：告别万能 Array，拥抱 List、Set 与 Map**
- **06. 面向对象进化：从 Class/Trait 到接口默认方法与抽象契约**

### 第二部分：突破心智关与工程核心（Part II: Engineering Core & JVM）
- **07. 健壮的异常机制：Checked 异常与 try-with-resources**
- **08. 真正理解泛型：从 PHPDoc 伪泛型到类型擦除与通配符**
- **09. 元编程与切面：注解、反射与 Spring AOP 动态代理**
- **10. 内存模型与 GC：从 zval 引用计数到 JVM 堆栈与垃圾收集器**
- **11. 并发与多线程：从 Shared-Nothing 到 JMM、线程池与锁**
- **12. 虚拟线程与新并发：Java 21 Project Loom 对决 Swoole 协程**

### 第三部分：框架实战、企业级架构与生态融合（Part III: Frameworks & Enterprise Architecture）
- **13. 框架决胜：Laravel 与 Spring Boot 3 核心体系深度映射**
- **14. 数据持久化：ActiveRecord (Eloquent) 到 Data Mapper (MyBatis / JPA)**
- **15. 企业级微服务全家桶：Nacos、Gateway、RocketMQ 与高可用**
- **16. 最佳实践与罗塞塔石碑：PHP / Java 语法与生态终极速查**
- **17. 综合实战与平滑迁移：绞杀者模式重构核心业务实战**

---

## 🏗️ 架构全景与对比

```mermaid
flowchart TD
    subgraph PHP 经典生态 (Shared-Nothing)
        A1[Nginx 反向代理] --> A2[PHP-FPM 工作进程池]
        A2 --> A3[请求级 Zend 引擎分配内存]
        A3 --> A4[业务逻辑处理]
        A4 --> A5[请求结束：Zend GC 瞬间清空全部内存]
        A4 -. 状态跨请求共享 .-> A6[(Redis / Memcached 集中存储)]
    end

    subgraph Java 现代企业级生态 (JVM 常驻多线程)
        B1[Spring Cloud Gateway / SLB] --> B2[JVM 常驻进程 / 内置 Web 容器]
        B2 --> B3[虚拟线程 / 工作线程池并发调度]
        B3 --> B4[Spring Boot 业务组件]
        B4 --> B5[堆内共享状态 / 本地高性能缓存 Caffeine]
        B4 --> B6[JVM 堆内存分代回收 G1 / ZGC]
    end
```

---

## 🛠️ 本地预览与阅读

本项目使用 [mdBook](https://rust-lang.github.io/mdBook/) 与 [mdbook-mermaid](https://github.com/badboy/mdbook-mermaid) 进行编译渲染。

### 方式一：在线阅读（推荐）
访问 GitHub Pages 在线图书：
👉 **https://tinywan.github.io/Java-For-PHP-Programmers/**

### 方式二：本地运行
```bash
# 1. 克隆仓库
git clone https://github.com/Tinywan/Java-For-PHP-Programmers.git
cd Java-For-PHP-Programmers

# 2. 安装 mdBook 与 Mermaid 插件（需 Rust Cargo 环境）
cargo install mdbook
cargo install mdbook-mermaid

# 3. 关联 Mermaid 预处理器
mdbook-mermaid install .

# 4. 启动本地热重载预览
mdbook serve --open
```

---

## 📄 详细规划与技术规范

完整实施路线图与设计文档请查阅：[PLAN.md](./PLAN.md)。

---

## 🤝 参与贡献

欢迎对 PHP 和 Java 充满热情的小伙伴共同完善本教程！
- 提交 Issue 探讨章节内容或提出你在学习 Java 时的困惑；
- 提交 PR 贡献示例代码、修复笔误或优化图表。

## 📜 许可协议

[MIT License](./LICENSE).
