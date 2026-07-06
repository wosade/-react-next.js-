import { Logger } from 'tslog';

/**
 * 统一日志实例
 *
 * tslog 自动显示时间戳 + 级别 + 源文件:行号
 * 用法：log.info('消息'), log.warn('警告'), log.error('错误', error)
 */
export const log = new Logger({
  type: 'pretty',
  name: '',
  minLevel: 0, // 0=silly 全部显示
  hideLogPositionForProduction: false,
  prettyLogTemplate: '{{yyyy}}-{{mm}}-{{dd}} {{hh}}:{{MM}}:{{ss}}.{{ms}}  {{logLevelName}}  {{filePathWithLine}}  ',
  prettyLogStyles: {
    logLevelName: {
      '*': ['bold'],
      INFO: ['cyan', 'bold'],
      WARN: ['yellow', 'bold'],
      ERROR: ['red', 'bold'],
      FATAL: ['red', 'bold', 'bgWhite'],
    },
  },
});

export default log;
