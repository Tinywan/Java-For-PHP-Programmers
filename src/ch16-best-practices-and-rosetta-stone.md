# 16. 最佳实践与罗塞塔石碑：PHP / Java 语法与生态终极速查

> “掌握了罗塞塔石碑，两种语言的互译便如呼吸般自然。”

本章汇编了 PHP 与 Java 最常用核心函数、语法结构、设计模式的对照表，并总结了 **PHP 开发者进阶 Java 时最常踩的 Top 20 经典技术陷阱**，建议收藏作为案头常备速查手册。

---

## 1. 核心 API 罗塞塔石碑速查表

### 字符串操作对照：

| 操作诉求 | PHP (PHP 8+) | Java (Java 21) |
| :--- | :--- | :--- |
| **获取字符串长度** | `strlen($s)` / `mb_strlen($s)` | `s.length()` |
| **是否包含子串** | `str_contains($s, 'foo')` | `s.contains("foo")` |
| **子串位置查找** | `strpos($s, 'foo')` | `s.indexOf("foo")` (未找到返回 `-1`) |
| **截取子串** | `substr($s, 0, 5)` | `s.substring(0, 5)` |
| **分割字符串** | `explode(',', $s)` | `s.split(",")` (返回 `String[]`) |
| **拼接数组为字符串** | `implode(',', $arr)` | `String.join(",", list)` |
| **去除首尾空白** | `trim($s)` | `s.strip()` (Java 11+ 支持全角空格) 或 `s.trim()` |
| **判断是否为空白串**| `empty(trim($s))` | `s.isBlank()` (Java 11+) |
| **字符串替换** | `str_replace('a', 'b', $s)` | `s.replace("a", "b")` |
| **格式化输出** | `sprintf("Hello %s", $name)` | `String.format("Hello %s", name)` |

---

### 数组与集合操作对照：

| 操作诉求 | PHP (万能 Array) | Java (JCF 集合体系) |
| :--- | :--- | :--- |
| **获取元素数量** | `count($arr)` | `list.size()` 或 `map.size()` |
| **判断元素是否存在** | `in_array($val, $arr)` | `list.contains(val)` 或 `set.contains(val)` |
| **判断 Key 是否存在** | `array_key_exists($k, $arr)` | `map.containsKey(k)` |
| **提取所有 Key 列表**| `array_keys($arr)` | `map.keySet()` (返回 `Set<K>`) |
| **提取所有 Value 列表**| `array_values($arr)` | `new ArrayList<>(map.values())` |
| **合并两个数组/列表** | `array_merge($a, $b)` | `listA.addAll(listB)` |
| **JSON 序列化** | `json_encode($data)` | `JacksonMapper.writeValueAsString(data)` |
| **JSON 反序列化** | `json_decode($json, true)` | `JacksonMapper.readValue(json, Clazz.class)` |
| **映射转换** | `array_map(fn($x) => $x * 2, $arr)` | `list.stream().map(x -> x * 2).toList()` |
| **条件过滤** | `array_filter($arr, fn($x) => $x > 0)` | `list.stream().filter(x -> x > 0).toList()` |

---

### 时间与高精度数学计算对照：

| 操作诉求 | PHP | Java | 核心避坑点 |
| :--- | :--- | :--- | :--- |
| **获取当前时间戳** | `time()` (秒) / `microtime(true)` | `System.currentTimeMillis()` (毫秒) | Java 时间戳通常是**毫秒级（13位）**！ |
| **当前标准日期时间** | `date('Y-m-d H:i:s')` / Carbon | `LocalDateTime.now()` | 格式化用 `DateTimeFormatter` |
| **时间格式解析** | `strtotime('2026-01-01')` | `LocalDateTime.parse(str, formatter)` | 线程安全，可作为静态常量复用 |
| **金额金融高精度计算**| `bcadd($a, $b, 2)` / `bcmul()` | `BigDecimal` 类 | **严禁使用 `double/float` 算钱！** |

> [!CAUTION]
> **BigDecimal 构造方法避坑**：  
> 严禁使用 `new BigDecimal(0.1)`，因为二进制浮点数 0.1 存在精度损失；  
> 必须使用字符串构造：`new BigDecimal("0.1")` 或 `BigDecimal.valueOf(0.1)`！

---

## 2. PHP 开发者常踩的 Top 20 经典技术陷阱

1. **数值对象比较用 `==`**：超出 `-128~127` 缓存池的 `Integer` / `Long` 用 `==` 永远为 `false`，必须用 `.equals()`！
2. **在 foreach 循环中直接调用 `list.remove()`**：必定触发 `ConcurrentModificationException`，必须用 `list.removeIf()`。
3. **在 Spring `@Service` 单例中声明私有成员保存用户状态**：导致高并发下多用户数据相互串包覆盖。
4. **同类中自调用 `@Transactional` 方法**：绕过 Spring AOP 代理，导致事务完全失效不回滚。
5. **使用 `double` 或 `float` 计算货币金额**：二进制浮点精度缺失导致账目不平，必须全链路使用 `BigDecimal`。
6. **`@Transactional` 漏写 `rollbackFor = Exception.class`**：抛出受检异常（如 IOException）时数据库默认不回滚。
7. **包装类为 `null` 触发自动拆箱**：`Integer count = null; if (count > 0)` 直接抛出 `NullPointerException`。
8. **定义类或方法时漏写 `public`**：在 Java 中漏写是包访问权限（Package-Private），跨包反射和动态代理报错。
9. **使用普通静态 `static Map` 做全局缓存**：缺乏过期和驱逐机制，运行数天后必定打爆堆内存导致 OOM。
10. **线程池复用下 `ThreadLocal` 忘记 `.remove()`**：导致脏数据在不同请求间串用，并引发堆外/堆内内存泄漏。
11. **长循环中使用加号 `+` 频繁拼接字符串**：堆中生成海量无用中间对象挤爆内存，必须使用 `StringBuilder`。
12. **使用 `Executors.newFixedThreadPool`**：内置无界队列导致突发流量时堆积数百万任务引发 OOM。
13. **对 Java 21 虚拟线程搞线程池化（Pooling）**：虚拟线程极其廉价轻量，池化不仅毫无意义反而严重受限。
14. **在 `synchronized` 代码块内进行耗时阻塞 I/O**：固定（Pinning）载体线程，导致虚拟线程吞吐暴跌。
15. **盲目调用 `Optional.get()`**：不加 `isPresent()` 校验直接 `.get()` 等同于重现空指针异常，应优先使用 `.orElse()`。
16. **混淆 `List.of()` 只读集合与 `ArrayList`**：对 `List.of()` 尝试 `.add()` 或 `.remove()` 抛出 `UnsupportedOperationException`。
17. **Java 文件名与公共类名不一致**：大小写不严格匹配或名字不同，导致编译直接报错。
18. **空 `catch` 块吞噬异常**：`try { ... } catch (Exception e) {}` 导致线上排障无日志无告警，如同黑盒。
19. **对象传递误以为深拷贝**：Java 中对象赋值全为引用拷贝，修改副本会导致原始对象同步变化。
20. **重写 `equals()` 却忘记重写 `hashCode()`**：违反 Object 契约，导致相同键在 `HashMap` 中无法被正确定位和取出。

在最后一章中，我们将进入终极大考 —— **绞杀者模式实战：如何带领团队将现有 PHP 业务平滑渐进迁移到 Java 架构**！
