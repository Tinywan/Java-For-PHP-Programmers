# 14. 数据持久化：ActiveRecord (Eloquent) 到 Data Mapper (MyBatis / JPA)

> “Eloquent 让你感受一人成军的极速快感，Data Mapper 让你在千万级高并发与分库分表中行稳致远。”

对于 PHP 开发者来说，Laravel 的 **Eloquent ORM** 几乎是数据操作的代名词：
```php
// Eloquent 的 Active Record 模式：实体本身既是数据载体，又是数据库访问入口
$user = User::where('status', 1)->first();
$user->name = 'New Name';
$user->save();
$user->orders()->create(['amount' => 100]);
```

当你来到 Java 世界，你会发现持久层主要分为两大阵营：
1. **Spring Data JPA（底层为 Hibernate）**：完全面向对象的全自动 ORM，欧美企业主流；
2. **MyBatis / MyBatis-Plus**：半自动化、面向 SQL 的持久层框架，**国内 90% 以上中大型互联网公司的绝对首选**。

本章将对比两种持久化架构哲学，并以国内工业界最主流的 **MyBatis-Plus** 为核心，带你快速构建企业级持久层。

---

## 1. 架构哲学对决：Active Record vs Data Mapper

```mermaid
flowchart TD
    subgraph Active Record 模式 (PHP Eloquent)
        M1["User 实体模型 (Entity Model)"]
        M1 --> D1["承载用户属性 (id, name, email)"]
        M1 --> D2["内置数据库 CURD 方法 (save, delete)"]
        M1 --> D3["内置关联关系查询 (hasMany, belongsTo)"]
        Note1["数据与数据库操作强耦合，单体敏捷极快，大型系统易臃肿"]
    end

    subgraph Data Mapper 模式 (Java MyBatis / JPA)
        E1["User 实体 (纯净 POJO / 仅承载属性)"]
        Mapper1["UserMapper 接口 (专职负责数据库交互与 SQL)"]
        Service1["UserService 业务层 (编排业务逻辑)"]
        
        Service1 --> E1
        Service1 --> Mapper1
        Mapper1 -. 映射数据 .-> E1
        Mapper1 <==> DB[(MySQL 数据库)]
        Note2["职责彻底分离，SQL 完全可控，极度适合高并发调优与分库分表"]
    end
```

---

## 2. 工业界标配：MyBatis-Plus 极速上手

**MyBatis-Plus（简称 MP）** 为 MyBatis 提供了开箱即用的通用 CRUD 抽象，让你无需手写一行 XML SQL 即可拥有比肩甚至超越 Eloquent 的开发效率。

### 1. 实体定义（POJO）：
```java
@Data
@TableName("t_user") // 指定对应的数据库物理表名
public class User {
    @TableId(type = IdType.ASSIGN_ID) // 雪花算法全局唯一分布式 ID
    private Long id;

    @TableField("username")
    private String username;

    private String email;

    private Integer status;

    @TableLogic // 相当于 Laravel 的 SoftDeletes（软删除标记）
    private Integer deleted;

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
```

### 2. Mapper 接口定义（无需写实现类！）：
```java
@Mapper
public interface UserMapper extends BaseMapper<User> {
    // 继承 BaseMapper<User> 后，自动拥有了 20+ 个核心 CRUD 方法：
    // insert, deleteById, updateById, selectById, selectList, selectPage...
    
    // 如果有复杂的多表关联或报表统计，可直接自定义 SQL：
    @Select("SELECT * FROM t_user WHERE status = #{status} AND create_time >= #{startTime}")
    List<User> queryActiveUsers(int status, LocalDateTime startTime);
}
```

### 3. 类型安全的条件构造器：LambdaQueryWrapper
告别硬编码字段字符串，在重构时自动享受 IDE 重命名保护：

#### 对比 Laravel Eloquent 查询：
```php
$users = User::where('status', 1)
    ->whereNotNull('email')
    ->orderByDesc('id')
    ->limit(10)
    ->get();
```

#### MyBatis-Plus Lambda 查询：
```java
List<User> users = userMapper.selectList(
    new LambdaQueryWrapper<User>()
        .eq(User::getStatus, 1)
        .isNotNull(User::getEmail)
        .orderByDesc(User::getId)
        .last("LIMIT 10")
);
```

---

## 3. 事务处理：从 `DB::transaction` 到 `@Transactional`

在 Laravel 中，我们常用闭包执行事务：
```php
DB::transaction(function () use ($order, $stock) {
    $order->save();
    $stock->decrement('count', 1);
});
```

在 Spring Boot 中，声明式事务让你可以通过一个注解搞定整个方法的事务边界：

```java
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderMapper orderMapper;
    private final StockService stockService;

    // 声明式事务：方法内抛出任何 Exception 均自动回滚！
    @Transactional(rollbackFor = Exception.class)
    public void createOrder(OrderCreateDto dto) {
        // 1. 扣减库存
        stockService.deductStock(dto.productId(), dto.count());

        // 2. 创建订单主记录
        Order order = new Order();
        order.setUserId(dto.userId());
        order.setTotalAmount(dto.amount());
        orderMapper.insert(order);

        // 如果在此处抛出异常，上方所有的数据库操作全部自动回滚！
    }
}
```

---

## 4. 💣 核心避坑：`@Transactional` 事务失效的 5 大罪魁祸首

1. **方法不是 `public` 修饰**：Spring AOP 默认只代理公共方法，写成 `private` 事务直接被忽略；
2. **同类方法自调用（Self-Invocation）**：如第 9 章所述，通过 `this.method()` 调用绕过了代理对象，事务注解失效；
3. **未指定 `rollbackFor = Exception.class`**：
   - Spring 默认**只在抛出 `RuntimeException` 或 `Error` 时回滚**！
   - 如果你的代码抛出了受检异常（如 `IOException`、`SQLException`），默认**不会回滚**！必须显式声明 `@Transactional(rollbackFor = Exception.class)`；
4. **内部 `catch` 吞噬了异常**：如果在方法体内写了 `try-catch` 捕获了异常且未重新抛出，AOP 代理以为执行成功，照常执行提交；
5. **多线程并发操作数据库**：事务上下文是绑定在当前线程的 `ThreadLocal` 上的。如果在事务方法内部启动了子线程执行 SQL，子线程无法加入当前父线程的事务中。

在下一章中，我们将进入分布式高可用世界 —— **微服务全家桶：Nacos、网关、RocketMQ 与高可用治理**！
