/**
 * 模块名称：Android 基础单元测试
 * 职责描述：验证 Android 本地 JUnit 测试工具链可加载
 * 输入/输出：执行无平台依赖的确定性断言
 * 依赖关系：JUnit
 * 注意事项：领域测试的事实覆盖位于 Vitest，本测试只探测 Gradle/JUnit
 */
package com.getcapacitor.myapp;

import static org.junit.Assert.*;

import org.junit.Test;

/**
 * Example local unit test, which will execute on the development machine (host).
 *
 * @see <a href="http://d.android.com/tools/testing">Testing documentation</a>
 */
public class ExampleUnitTest {

    @Test
    public void addition_isCorrect() throws Exception {
        assertEquals(4, 2 + 2);
    }
}
