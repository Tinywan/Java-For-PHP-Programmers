# 13. 框架决胜：Laravel 与 Spring Boot 3 核心体系深度映射

> “Laravel 是优雅敏捷的工匠艺术品，Spring Boot 3 是模块化工业级系统的基石。”

在现代 Web 全栈开发中，**Laravel** 与 **Spring Boot** 分别代表了 PHP 与 Java 生态中综合体验最好、占有率最高的两大超级框架。

许多从 PHP 转入 Java 的开发者常常感到困惑：Laravel 的各种魔术调用和 Facade 在 Spring 中找不到了；而 Spring 复杂的 Bean 生命周期、注解驱动又显得过于抽象。

本章将通过精确的“一对一”功能对标，将你积累多年的 Laravel 架构功底，直接变现为现代 Spring Boot 3 的开发战斗力。

---

## 1. 核心设计哲学与技术栈对齐表

| 核心组件 / 机制 | Laravel (PHP 8+) | Spring Boot 3 (Java 21) | 心智模型转换重点 |
| :--- | :--- | :--- | :--- |
| **容器核心** | Service Container (IoC 容器) | ApplicationContext (Spring IoC / DI) | 概念完全一致，均基于控制反转与依赖注入 |
| **组件注册** | `ServiceProvider` (`$this->app->singleton`) | `@Configuration` + `@Bean` 或 `@Service` / `@Component` 自动扫描 | Spring Boot 通过注解驱动自动装配，无需手动写 Provider 数组 |
| **依赖注入** | 构造函数类型提示自动注入 | 构造函数注入（推荐）或 `@Autowired` | Spring 严格检查循环依赖；单例 Bean 在多线程中共享 |
| **快捷访问门面** | Facade（如 `Cache::get()`、`Auth::user()`） | 注入对应的 Service Bean 实例直接调用 | 告别静态门面魔术，拥抱显式类型注入 |
| **路由与控制器** | `routes/api.php` + Controller | `@RestController` + `@GetMapping` / `@PostMapping` | 路由直接通过注解声明在控制器方法上 |
| **请求拦截** | HTTP Middleware (中间件) | `Filter` (Servlet 滤镜) / `HandlerInterceptor` (拦截器) | 同样支持前后置拦截与链路传递 |
| **表单与参数验证** | `FormRequest` / `validate()` | Jakarta Validation (`@Valid` + `@NotNull` / `@Size` 等注解) | 声明式注解校验，配合统一异常切面捕获 |
| **配置文件** | `.env` + `config/*.php` | `application.yml` + `@ConfigurationProperties` | YAML 层次化结构，原生支持多环境 Profile 切换 |

---

## 2. 依赖注入与组件生命周期

### 组件声明与注册对比：

#### Laravel 风格
```php
// app/Services/PaymentService.php
namespace App\Services;

class PaymentService {
    public function pay(int $amount): bool {
        return true;
    }
}

// 在 AppServiceProvider 中绑定或直接通过容器反射解析
```

#### Spring Boot 3 风格
```java
package com.tinywan.service;

import org.springframework.stereotype.Service;

// 标注 @Service 注解，Spring 在启动时会自动扫描并将其作为单例 Bean 纳入容器管理
@Service
public class PaymentService {
    public boolean pay(long amount) {
        return true;
    }
}
```

### 依赖注入使用对比：

#### Laravel 构造注入
```php
class OrderController extends Controller {
    public function __construct(
        private PaymentService $paymentService
    ) {}
}
```

#### Spring Boot 3 构造注入（官方首选推荐写法）
```java
@RestController
@RequestMapping("/orders")
public class OrderController {
    private final PaymentService paymentService;

    // 当只有一个构造函数时，Spring Boot 会自动注入依赖，无需写 @Autowired！
    public OrderController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }
}
```

> [!CAUTION]
> **致命陷阱：千万不要在 Spring 单例 Bean 中保存用户请求状态！**  
> 在 Laravel 中，每个 HTTP 请求都是一个新进程，你在 Controller 或 Service 中写 `$this->userId = $request->input('id');` 在单次请求内是安全的。  
> **但在 Spring Boot 中，所有的 `@Service` 和 `@RestController` 默认都是全局单例（Singleton）！**  
> 成千上万个并发线程会同时调用同一个 Service 实例。如果你在 Service 中定义了成员变量记录用户 ID，不同的用户请求就会互相覆盖对方的数据，造成不可挽回的灾难！**Spring Service 必须是无状态的（Stateless）！**

---

## 3. Web 请求处理与路由映射

在 Spring MVC 中，路由直接作为注解写在控制器类和方法上方：

```java
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor // Lombok 注解：自动生成包含 final 字段的构造函数
@Slf4j
public class UserController {

    private final UserService userService;

    // 1. GET 请求：接收路径参数与 Query 查询参数
    // 对标 Laravel: Route::get('/{id}', [UserController::class, 'show']);
    @GetMapping("/{id}")
    public ApiResponse<UserVo> getUserDetail(
            @PathVariable("id") Long id,
            @RequestParam(value = "includeOrders", defaultValue = "false") boolean includeOrders) {
        
        UserVo vo = userService.getUserDetail(id, includeOrders);
        return ApiResponse.success(vo);
    }

    // 2. POST 请求：接收 JSON Body 参数并进行表单自动验证
    // 对标 Laravel: Route::post('/', [UserController::class, 'store']);
    @PostMapping
    public ApiResponse<Long> createUser(@Valid @RequestBody CreateUserRequest request) {
        Long userId = userService.createUser(request);
        return ApiResponse.success(userId);
    }
}
```

### 请求参数校验模型（对标 Laravel FormRequest）：
```java
// 使用 Java 14+ Record 结合 Jakarta Validation 注解
public record CreateUserRequest(
    @NotBlank(message = "用户名不能为空")
    @Size(min = 4, max = 20, message = "用户名长度必须在 4-20 之间")
    String username,

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不合法")
    String email,

    @Min(value = 18, message = "未成年人禁止注册")
    Integer age
) {}
```

---

## 4. 多环境配置管理：`.env` vs `application.yml`

在 Laravel 中，我们在根目录下放置 `.env`，并在 `config/database.php` 中使用 `env('DB_HOST')` 引用。

在 Spring Boot 中，推荐使用 **层次化 YAML 格式**，并通过 **Profiles** 区分开发与生产环境：

### 主配置文件：`src/main/resources/application.yml`
```yaml
server:
  port: 8080

spring:
  application:
    name: order-center
  profiles:
    active: dev # 激活开发环境，会自动合并加载 application-dev.yml
  threads:
    virtual:
      enabled: true # 开启 Java 21 虚拟线程
```

### 开发环境：`application-dev.yml`
```yaml
spring:
  datasource:
    url: jdbc:mysql://127.0.0.1:3306/db_order_dev?useSSL=false&serverTimezone=UTC
    username: root
    password: root_password
```

### 读取配置数据到 Java 对象：
```java
@ConfigurationProperties(prefix = "app.payment")
@Component
@Data
public class PaymentProperties {
    private String appId;
    private String mchKey;
    private int timeout = 3000;
}
```

在下一章中，我们将进入持久层核心，对比 **Active Record (Laravel Eloquent) 与 Data Mapper (MyBatis / MyBatis-Plus / JPA)** 的架构演进！
