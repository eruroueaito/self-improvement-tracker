/**
 * 模块名称：Android 基础仪器测试
 * 职责描述：验证测试设备加载的是本项目 Android applicationId
 * 输入/输出：读取目标 Context，断言包名正确
 * 依赖关系：AndroidX Test、JUnit
 * 注意事项：需要 Android 设备或模拟器运行
 */
package com.getcapacitor.myapp;

import static org.junit.Assert.*;

import android.content.Context;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Instrumented test, which will execute on an Android device.
 *
 * @see <a href="http://d.android.com/tools/testing">Testing documentation</a>
 */
@RunWith(AndroidJUnit4.class)
public class ExampleInstrumentedTest {

    @Test
    public void useAppContext() throws Exception {
        // Context of the app under test.
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();

        assertEquals("dev.selfimprovement.tracker", appContext.getPackageName());
    }
}
