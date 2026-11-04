# 06. 面向对象进化：从 Class/Trait 到接口默认方法与抽象契约

> “PHP 用 Trait 解决多继承的便利性，Java 用接口默认方法与组装模式守护架构的边界。”

PHP 与 Java 都属于基于类的面向对象（Class-based OOP）语言。许多概念在两者之间是共通的，例如 `extends` 单继承、`implements` 接口实现、`abstract` 抽象类以及多态（Polymorphism）。

但在进阶特性上，两者的哲学产生了明显的分野：PHP 依靠 **Trait** 实现水平代码复用（类似于在运行时把代码直接“拷贝”进类中），而 Java 则依靠强大的**富接口（带默认方法）**与**组合模式（Composition）**保持类型的严谨与正交性。

本章将梳理面向对象的进阶差异，并深入剖析访问修饰符中隐藏的重大心智盲区。

---

## 1. 访问修饰符对决：危险的“缺省”差异

在 PHP 中，如果不写访问修饰符（如 `function doSomething()`），方法默认是 **`public`** 的。

在 Java 中，如果你漏写修饰符，它既不是 `public`，也不是 `private`，而是特殊的 **Package-Private（包访问权限，即 default）**！

| 修饰符 | 同一个类内部 | 同一个包（Package）内其他类 | 子类（不同包） | 全局外部公开 |
| :--- | :---: | :---: | :---: | :---: |
| `private` | ✅ | ❌ | ❌ | ❌ |
| **缺省 (无修饰符)** | ✅ | ✅ | ❌ | ❌ |
| `protected` | ✅ | ✅ | ✅ | ❌ |
| `public` | ✅ | ✅ | ✅ | ✅ |

> [!CAUTION]
> **切勿漏写 `public`！**  
> 如果在定义 Spring Controller、Service 或公共工具方法时漏写了 `public`，同包下测试可能一切正常，但跨包调用或反射框架生成动态代理时将直接抛出访问拒绝异常！

---

## 2. 如何在 Java 中替代 PHP 的 Trait？

在 PHP 项目中，Trait 被广泛滥用，例如 Laravel 的 `HasFactory`、`AuthorizesRequests`、`SoftDeletes`。虽然开发极快，但容易导致类职责不清晰、方法名冲突隐蔽、运行时状态被随意修改。

Java 坚决不引入 Trait，而是通过以下两种优雅手段解决代码复用：

### 方案一：接口默认方法（Interface Default Methods）
自 Java 8 开始，接口中不仅可以定义抽象方法契约，还可以通过 `default` 关键字提供**具体的默认实现**：

```java
public interface Auditable {
    // 抽象方法：由具体实现类提供（无状态）
    String getOperator();

    // 默认方法：行为复用
    default void logAudit(String action) {
        System.out.printf("[审计日志] 操作人: %s, 执行动作: %s, 时间: %s%n",
                getOperator(), action, java.time.LocalDateTime.now());
    }
}
```

```java
// 具体业务类多实现接口
public class OrderService implements Auditable {
    @Override
    public String getOperator() {
        return "admin_01";
    }

    public void cancelOrder(Long orderId) {
        // 直接调用接口默认方法
        logAudit("取消订单: " + orderId);
    }
}
```

> [!NOTE]
> **接口默认方法与 Trait 的本质区别**：  
> 接口默认方法是**无状态（Stateless）**的，接口中绝对不能声明成员变量（只能声明 `public static final` 常量）。它只负责定义行为逻辑，状态必须由具体实现类持有。

### 方案二：组合优于继承（Composition over Inheritance）
如果需要复用有状态的代码，Java 社区崇尚通过对象注入组合完成：
```java
@Service
public class OrderService {
    // 将能力委托给独立的组件
    private final NotificationService notificationService;

    public OrderService(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    public void completeOrder() {
        notificationService.sendSms("订单已完成");
    }
}
```

---

## 3. 枚举（Enum）的降维打击

在 PHP 8.1 引入 Backed Enum 之前，PHP 只能用类常量模拟枚举。即使是现代 PHP 的枚举，也仅限于纯数据的包装。

而在 Java 中，**`enum` 是一个完整的、功能齐备的特殊 Class**！它可以拥有私有字段、自定义构造器、成员方法，甚至可以实现接口：

```java
public enum OrderStatus {
    PENDING(10, "待支付"),
    PAID(20, "已支付"),
    CANCELLED(90, "已取消");

    private final int code;
    private final String description;

    // 枚举构造函数必须是私有的
    OrderStatus(int code, String description) {
        this.code = code;
        this.description = description;
    }

    public int getCode() { return code; }
    public String getDescription() { return description; }

    // 自定义业务判断方法
    public boolean canCancel() {
        return this == PENDING;
    }

    // 根据 code 反查枚举
    public static OrderStatus fromCode(int code) {
        for (OrderStatus status : values()) {
            if (status.code == code) {
                return status;
            }
        }
        throw new IllegalArgumentException("无效的状态码: " + code);
    }
}
```

### 使用枚举：
```java
OrderStatus status = OrderStatus.PENDING;

if (status.canCancel()) {
    System.out.println("允许取消，当前状态: " + status.getDescription());
}

// 配合 Switch 表达式极其整洁（无需 default）
String tip = switch (status) {
    case PENDING -> "请尽快完成付款";
    case PAID -> "商品正在出库";
    case CANCELLED -> "款项原路退回";
};
```

---

## 4. 经典设计模式在两套语言中的落地映射

### 单例模式（Singleton）：
- **PHP**：由于 PHP-FPM 单请求隔离，PHP 的单例通常只在“当前请求生命周期内”保持唯一；
- **Java**：在 JVM 堆内存常驻，整个 JVM 进程中所有线程共享同一个单例实例。必须考虑线程安全性：
  - 在 Spring 框架中，所有 `@Service`、`@Component` 默认就是由 Spring IoC 容器维护的**严格单例**；
  - 手写推荐使用静态内部类或单元素枚举：
  ```java
  public class ConfigManager {
      private ConfigManager() {}

      private static class Holder {
          private static final ConfigManager INSTANCE = new ConfigManager();
      }

      public static ConfigManager getInstance() {
          return Holder.INSTANCE;
      }
  }
  ```

### 策略模式（Strategy）：
在 PHP 中通常用工厂类根据入参 `switch` 实例化不同的类。在 Java / Spring 中，可直接通过依赖注入 Map 实现优雅策略路由：
```java
@Service
public class PaymentContext {
    // Spring 会自动将所有实现了 PaymentStrategy 的 Bean 注入到此 Map 中
    // Key 为 Bean 的名字（如 "wechatPay", "aliPay"）
    private final Map<String, PaymentStrategy> strategyMap;

    public PaymentContext(Map<String, PaymentStrategy> strategyMap) {
        this.strategyMap = strategyMap;
    }

    public void pay(String channel, BigDecimal amount) {
        PaymentStrategy strategy = strategyMap.get(channel);
        if (strategy == null) {
            throw new IllegalArgumentException("不支持的支付渠道: " + channel);
        }
        strategy.execute(amount);
    }
}
```

至此，第一部分基础语法与面向对象重塑已全部通关。在第二部分中，我们将迎来 Java 工程体系最硬核的领域：**Checked 异常机制、泛型类型擦除、JVM 内存调优与高并发多线程**！
