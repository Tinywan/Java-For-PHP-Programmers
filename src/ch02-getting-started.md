# 02. 工具链起步：从 Composer 到 Maven / Gradle 与 JDK 生态

> “一个合格的工具链让开发者省去 80% 的环境排查与构建烦恼。”

对于习惯了 `composer require`、`php -S` 和 PSR-4 自动加载的 PHP 开发者而言，初入 Java 世界时，最容易被复杂的 JDK 发行版选择、Maven/Gradle 配置文件以及 Classpath 类路径机制绕晕。

本章将通过精确的对照表，帮助你以最快的速度建立起现代 Java 21 与 Maven 的工程化工具链认知。

---

## 1. JDK 版本的选择与环境搭建

在 PHP 世界中，官方版本（PHP 7.4 -> 8.0 -> 8.1 -> 8.2 -> 8.3）相对线性和统一。而在 Java 世界中，由于 Java 是一个遵循 JCP 规范的开放标准，存在多个厂商编译的发行版。

### 发行版推荐法则：
- **选择长期支持版（LTS）**：生产环境严禁选用非 LTS 版本。当前企业推荐版本为 **Java 17 LTS** 或 **Java 21 LTS**（本书全面以 Java 21 为基准）。
- **主流发行版对决**：
  - **Eclipse Temurin (Adoptium)**：社区最通用、100% 开源纯净的 OpenJDK 构建版本（**首选推荐**）；
  - **Amazon Corretto**：亚马逊云官方构建，性能强劲，在云原生环境中极广泛；
  - **Alibaba Dragonwell**：阿里开源的 OpenJDK 定制版，针对大规模高并发与容器化做了深度优化。

> [!TIP]
> **多版本管理神器：SDKMAN!**  
> 就像 PHP 开发者使用 `phpenv` 或 Docker 管理多个 PHP 版本一样，Linux / macOS / WSL 开发者强烈推荐使用 [SDKMAN!](https://sdkman.io/)：
> ```bash
> # 安装 SDKMAN!
> curl -s "https://get.sdkman.io" | bash
> 
> # 安装最新的 Java 21 Temurin
> sdk install java 21.0.2-tem
> 
> # 安装 Maven
> sdk install maven
> ```

---

## 2. Composer 与 Maven 的核心映射

PHP 开发者对 `composer.json` 和 `packagist.org` 已经熟记于心。在 Java 中，最老牌稳健的构建工具是 **Maven**，而新兴且构建脚本更灵活的是 **Gradle**。作为初学者，强烈建议先攻克 Maven，因为企业中 85% 以上的项目均采用 Maven 构建。

| 概念维度 | PHP (Composer) | Java (Maven) | 核心心智差异 |
| :--- | :--- | :--- | :--- |
| **项目元数据文件** | `composer.json` | `pom.xml` (Project Object Model) | JSON 语法 vs XML 语法 |
| **依赖锁定文件** | `composer.lock` | 依赖树固化在 `pom.xml` 中（通过版本声明或 `<dependencyManagement>`） | Maven 遵循“短路优先”与“声明先后”依赖冲突解决原则 |
| **官方依赖中央仓库** | Packagist (`packagist.org`) | Maven Central (`repo1.maven.org`) | 均支持配置国内阿里云镜像加速 |
| **命名空间与定位标示** | `vendor/package-name` | GAV 坐标：`groupId:artifactId:version` | Java 的组件必须由组织域名反写+构件名+版本唯一确定 |
| **本地依赖存储** | 当前项目下的 `vendor/` 目录 | 用户主目录全局缓存 `~/.m2/repository/` | 避免多项目重复下载几十 G 依赖，节省磁盘空间 |
| **构建产物** | 无（直接执行源码文件） | `.jar` (Java Archive) 或 `.war` 压缩归档包 | Java 需要显式编译字节码并打包为 Fat JAR |

### 依赖声明直观对照：

#### PHP `composer.json`
```json
{
  "name": "tinywan/order-service",
  "require": {
    "php": "^8.2",
    "guzzlehttp/guzzle": "^7.8"
  }
}
```

#### Java `pom.xml`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <!-- 项目自身的 GAV 坐标 -->
    <groupId>com.tinywan</groupId>
    <artifactId>order-service</artifactId>
    <version>1.0.0-SNAPSHOT</version>

    <properties>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <dependencies>
        <!-- 类似 require guzzlehttp/guzzle -->
        <dependency>
            <groupId>com.squareup.okhttp3</groupId>
            <artifactId>okhttp</artifactId>
            <version>4.12.0</version>
        </dependency>
    </dependencies>
</project>
```

---

## 3. 目录结构与类加载：PSR-4 vs Java Package

在 PHP 中，PSR-4 规范规定了命名空间与文件系统路径的映射。Java 的包机制（Package）在概念上几乎与 PSR-4 如出一辙，但约束更为严苛。

### 标准项目工程目录树对照：

```
PHP (Laravel/Symfony 标准)           Java (Maven 标准目录布局)
├── app/                           ├── src/
│   ├── Http/Controllers/          │   ├── main/
│   │   └── UserController.php     │   │   ├── java/
│   └── Models/                    │   │   │   └── com/tinywan/app/
│       └── User.php               │   │   │       ├── controller/
├── config/                        │   │   │       │   └── UserController.java
├── database/                      │   │   │       └── model/
├── public/                        │   │   │           └── User.java
├── tests/                         │   │   └── resources/
│   └── Feature/                   │   │       ├── application.yml
├── composer.json                  │   │       └── static/
└── vendor/                        │   └── test/
                                   │       └── java/com/tinywan/app/
                                   ├── pom.xml
                                   └── target/ (编译产物)
```

> [!IMPORTANT]
> **强约束规则：文件名必须与公共类名完全一致！**  
> 在 PHP 中，`class User` 即使写在 `user_model.php` 中也可以通过 include 运行。但是在 Java 中：
> - `public class User` 的文件名**必须**是 `User.java`，大小写敏感；
> - 类的第一行非注释代码**必须**声明其所在的包路径：`package com.tinywan.app.model;`。

---

## 4. 常用构建与执行命令对照表

| 操作诉求 | PHP / Composer 命令 | Java / Maven 命令 |
| :--- | :--- | :--- |
| **初始化工程** | `composer init` | `mvn archetype:generate` |
| **下载并解析依赖** | `composer install` | `mvn clean compile` / `mvn dependency:resolve` |
| **更新依赖库** | `composer update` | 手动修改 `pom.xml` 版本号后刷新 |
| **运行单元测试** | `php artisan test` 或 `vendor/bin/phpunit` | `mvn test` |
| **打包产物** | 无（直接部署源代码目录） | `mvn clean package`（在 `target/` 下生成 `.jar`） |
| **运行应用** | `php -S 0.0.0.0:8000` / `php public/index.php` | `java -jar target/order-service-1.0.0.jar` |

---

## 5. IDE 生产力：从 PhpStorm 到 IntelliJ IDEA

作为 JetBrains 家族的旗舰产品，PhpStorm 的快捷键和使用习惯在 IntelliJ IDEA 中几乎 100% 通用：
- **跳转到类声明**：`Ctrl + N` (macOS: `Cmd + O`)
- **跳转到文件**：`Ctrl + Shift + N` (macOS: `Cmd + Shift + O`)
- **万能代码补全与提示**：`Alt + Enter` (macOS: `Option + Enter`)
- **生成代码（Getter/Setter/Constructor）**：`Alt + Insert` (macOS: `Cmd + N`)

在下一章中，我们将进入核心语法领域，彻底攻克从弱类型到强类型的思维蜕变！
