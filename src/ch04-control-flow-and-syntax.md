# 04. 流程控制与现代语法：Pattern Matching、Record 与新特性

> “现代 Java 兼顾了强类型语言的严谨与脚本语言的表达简洁性。”

许多 PHP 开发者对 Java 留存的另一个刻板印象是“样板代码（Boilerplate）太多”：定义一个包含三个属性的数据传输对象（DTO），需要写出上百行的私有成员、构造函数、Getter/Setter、`toString()`、`equals()` 和 `hashCode()`。

如果你还停留在那个时期，那么现代 Java（Java 14 ~ 21）的新语法特性将彻底刷新你的认知。本章将带你领略现代 Switch 表达式、模式匹配（Pattern Matching）、不可变数据载体 **Record** 以及密封类（Sealed Classes）。

---

## 1. 流程控制的进化：Switch 表达式与 `yield`

在 PHP 8 中，引入了极具表现力的 `match` 表达式，用以取代古老易发生穿透（Fall-through）的 `switch`。

Java 从 Java 14 开始正式引入了 **Switch 表达式**，不仅语法上与 PHP `match` 高度同步，而且彻底消除了漏写 `break` 导致的穿透灾难。

### 语法对照：

#### PHP 8 `match` 表达式
```php
$status = 2;
$message = match ($status) {
    1 => '待支付',
    2 => '已支付',
    3, 4 => '已退款',
    default => '未知状态',
};
```

#### 现代 Java Switch 表达式
```java
int status = 2;
String message = switch (status) {
    case 1 -> "待支付";
    case 2 -> "已支付";
    case 3, 4 -> "已退款";
    default -> "未知状态";
};
```

> [!TIP]
> 如果某个分支需要执行多行逻辑并返回值，可以使用 `yield` 关键字：
> ```java
> String result = switch (status) {
>     case 2 -> {
>         System.out.println("记录已支付日志...");
>         yield "支付成功完成";
>     }
>     default -> "处理中";
> };
> ```

---

## 2. 模式匹配：instanceof 的降维升级

在 PHP 中，检查对象类型通常使用 `instanceof`：
```php
if ($user instanceof VipUser) {
    $discount = $user->getDiscount();
}
```

在旧版 Java 中，判断类型之后必须繁琐地进行一次强制类型转换：
```java
// 传统 Java 笨重写法
if (obj instanceof VipUser) {
    VipUser user = (VipUser) obj; // 手动强转，既冗长又难看
    System.out.println(user.getDiscount());
}
```

Java 16 正式引入了 **Pattern Matching for instanceof**，判断成立时自动完成绑定与强转：
```java
// 现代 Java 优雅写法
if (obj instanceof VipUser user) {
    System.out.println(user.getDiscount()); // 直接作为 user 使用！
}
```

Java 21 进一步支持了 **Switch 模式匹配**，可以像处理代数数据类型一样处理复杂的多态对象：
```java
static String formatObject(Object obj) {
    return switch (obj) {
        case Integer i -> String.format("整型数值: %d", i);
        case Long l    -> String.format("长整型数值: %d", l);
        case Double d  -> String.format("双精度浮点: %f", d);
        case String s  -> String.format("字符串内容: %s", s);
        case null      -> "空引用 null";
        default        -> obj.toString();
    };
}
```

---

## 3. 不可变数据模型：告别样板代码的 `Record`

在 PHP 8 中，引入了构造器属性提升（Constructor Property Promotion）和只读类（Readonly Class）：
```php
readonly class UserDto {
    public function __construct(
        public int $id,
        public string $name,
        public string $email
    ) {}
}
```

Java 14 引入的 **`record`（记录类）** 则是 Java 历史上最受欢迎的现代化特性之一。它专门用来声明纯粹的、不可变的数据传输载体（DTO、VO、QueryParam）：

```java
public record UserDto(Long id, String name, String email) {
    // 仅仅这一行代码，编译器便自动生成了：
    // 1. private final 字段
    // 2. 全参构造函数 UserDto(Long id, String name, String email)
    // 3. 字段访问器方法：id(), name(), email() (注意：没有 get 前缀)
    // 4. 基于全部字段实现的 equals()、hashCode() 和 toString()
}
```

### 使用 Record：
```java
UserDto user = new UserDto(1001L, "Tinywan", "tinywan@example.com");

// 获取字段
System.out.println(user.name()); // 输出: Tinywan
System.out.println(user.id());   // 输出: 1001

// 打印对象
System.out.println(user); 
// 自动输出: UserDto[id=1001, name=Tinywan, email=tinywan@example.com]

// 紧凑构造校验（Compact Constructor）
public record UserDto(Long id, String name, String email) {
    public UserDto {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("用户 ID 不合法");
        }
    }
}
```

> [!NOTE]
> **Record vs 普通 Java Bean（或 Lombok `@Data`）**：  
> - 如果只是作为不可变的数据传递（HTTP 请求参数、响应 DTO、事件消息体），**坚决优先使用 `record`**；  
> - 如果需要经常被框架动态修改属性、具备双向持久化绑定（如某些传统 ORM 的持久化实体），才使用普通 Class + Lombok 注解。

---

## 4. 密封类（Sealed Classes）：编译期穷尽约束

在面向对象中，通常任何类都可以被自由继承。但有时候我们希望限制继承树，仅允许指定的一组子类存在（类似于带复杂类型的枚举），Java 17 引入了 `sealed` 语法：

```java
// 声明一个密封接口，仅允许 Success 和 Failure 实现
public sealed interface ApiResult permits Success, Failure {}

public final record Success(String data) implements ApiResult {}
public final record Failure(int code, String error) implements ApiResult {}
```

在配合 Switch 模式匹配时，由于编译器知道 `ApiResult` 只有这两种可能，因此**无需编写 `default` 分支**，若漏掉分支编译直接报错，达到 100% 的完备性保证：

```java
public static void handleResult(ApiResult result) {
    switch (result) {
        case Success s -> System.out.println("成功: " + s.data());
        case Failure f -> System.out.println("失败: " + f.error());
        // 编译器知道已经穷尽，无需 default！
    }
}
```

---

## 5. 多行文本块（Text Blocks）

PHP 长期以来拥有 `heredoc` 和 `nowdoc` 语法用于编写多行 SQL 或 JSON：
```php
$json = <<<JSON
{
    "code": 200,
    "message": "ok"
}
JSON;
```

Java 15 正式引入了三双引号 `"""` 文本块，不仅自动去除公共缩进，而且内部无需对单双引号做烦人的转义：

```java
String sql = """
    SELECT u.id, u.username, o.order_no
    FROM t_user u
    LEFT JOIN t_order o ON u.id = o.user_id
    WHERE u.status = 1
      AND o.created_at >= '2026-01-01'
    ORDER BY o.id DESC
    """;
```

在下一章中，我们将进入 PHP 开发者最核心的心智关卡 —— **集合框架与告别万能 Array**！
