/**
 * 模块名称：数据导出文件适配器
 * 职责描述：在浏览器触发本地下载，在 Android 写入临时文件并调用系统分享面板
 * 输入/输出：接收完整 JSON 与文件名，输出可由用户保存或分享的本地文件
 * 依赖关系：Capacitor Filesystem、Share、应用 ExportFilePort
 * 注意事项：只使用 cache 临时目录；导出不包含 API 密钥
 */
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { ExportFilePort } from '../../app/ports';

export class BrowserExportService implements ExportFilePort {
  async save(contents: string, filename: string): Promise<void> {
    const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}

export class NativeExportService implements ExportFilePort {
  async save(contents: string, filename: string): Promise<void> {
    const result = await Filesystem.writeFile({
      path: filename,
      data: contents,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    await Share.share({
      title: 'Self Improvement Tracker 数据导出',
      text: '完整本地数据备份',
      files: [result.uri],
      dialogTitle: '保存或分享 JSON 备份',
    });
  }
}
