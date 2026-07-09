import { z } from 'zod';
import { cacheGet } from '../../lib/cache.js';

const TTL = 600; // 天气缓存 10 分钟

/** get_weather 工具参数 Schema */
export const weatherSchema = z.object({
  city: z.string().describe('城市名称，如 北京、上海、深圳'),
});

/** OpenAI function definition（与 Schema 保持一致） */
export const weatherDefinition = {
  type: 'function' as const,
  function: {
    name: 'get_weather',
    description: '查询指定城市的实时天气信息',
    parameters: {
      type: 'object' as const,
      properties: {
        city: { type: 'string' as const, description: '城市名称，如 北京、上海、深圳' },
      },
      required: ['city'],
    },
  },
};

// 城市 → 经纬度映射（后续可扩展或接地理编码 API）
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  '北京': { lat: 39.9042, lon: 116.4074 },
  '上海': { lat: 31.2304, lon: 121.4737 },
  '深圳': { lat: 22.5431, lon: 114.0579 },
  '杭州': { lat: 30.2741, lon: 120.1551 },
  '广州': { lat: 23.1291, lon: 113.2644 },
  '成都': { lat: 30.5728, lon: 104.0668 },
  '武汉': { lat: 30.5928, lon: 114.3055 },
  '南京': { lat: 32.0603, lon: 118.7969 },
  '西安': { lat: 34.3416, lon: 108.9398 },
  '重庆': { lat: 29.4316, lon: 106.9123 },
  '天津': { lat: 39.3434, lon: 117.3616 },
  '苏州': { lat: 31.2990, lon: 120.5853 },
  '长沙': { lat: 28.2282, lon: 112.9388 },
  '郑州': { lat: 34.7466, lon: 113.6254 },
  '济南': { lat: 36.6512, lon: 116.9972 },
  '青岛': { lat: 36.0671, lon: 120.3826 },
  '厦门': { lat: 24.4798, lon: 118.0894 },
  '福州': { lat: 26.0745, lon: 119.2965 },
  '昆明': { lat: 25.0389, lon: 102.7183 },
  '贵阳': { lat: 26.6470, lon: 106.6302 },
  '合肥': { lat: 31.8206, lon: 117.2272 },
  '南昌': { lat: 28.6820, lon: 115.8579 },
  '沈阳': { lat: 41.8057, lon: 123.4315 },
  '哈尔滨': { lat: 45.8038, lon: 126.5350 },
  '长春': { lat: 43.8171, lon: 125.3235 },
  '太原': { lat: 37.8706, lon: 112.5489 },
  '石家庄': { lat: 38.0428, lon: 114.5149 },
  '兰州': { lat: 36.0611, lon: 103.8343 },
  '西宁': { lat: 36.6171, lon: 101.7785 },
  '海口': { lat: 20.0440, lon: 110.1999 },
  '三亚': { lat: 18.2528, lon: 109.5120 },
  '拉萨': { lat: 29.6500, lon: 91.1000 },
  '乌鲁木齐': { lat: 43.8256, lon: 87.6168 },
  '南宁': { lat: 22.8170, lon: 108.3665 },
  '呼和浩特': { lat: 40.8424, lon: 111.7490 },
  '银川': { lat: 38.4872, lon: 106.2309 },
};

/** 天气代码 → 中文描述 */
function weatherCodeToText(code: number): string {
  if (code === 0) return '晴';
  if (code <= 3) return '多云';
  if (code <= 48) return '雾/霾';
  if (code <= 57) return '毛毛雨';
  if (code <= 67) return '雨';
  if (code <= 77) return '雪';
  if (code <= 82) return '阵雨';
  if (code <= 86) return '阵雪';
  return '雷暴';
}

export async function getWeather(
  args: z.infer<typeof weatherSchema>,
): Promise<string> {
  const { city } = args;

  // 尝试模糊匹配城市名
  let coords: { lat: number; lon: number } | null = CITY_COORDS[city] ?? null;
  if (!coords) {
    const match = Object.entries(CITY_COORDS).find(([key]) =>
      key.includes(city) || city.includes(key),
    );
    coords = match?.[1] ?? null;
  }

  if (!coords) {
    return `未找到城市"${city}"的坐标信息。请尝试用具体城市名查询，如"北京"、"上海"等。目前支持 ${Object.keys(CITY_COORDS).length} 个主要城市的天气查询。`;
  }

  return cacheGet(
    `weather:${city}`,
    async () => {
      try {
        // 调用 Open-Meteo 免费天气 API（无需 API Key）
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords!.lat}&longitude=${coords!.lon}&current_weather=true&timezone=Asia%2FShanghai`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as any;

        const cw = data.current_weather;
        if (!cw) return `${city}天气数据暂不可用，请稍后重试。`;

        const desc = weatherCodeToText(cw.weathercode);
        const temp = cw.temperature;
        const wind = cw.windspeed;
        const humidity = data.hourly?.relativehumidity_2m?.[0] ?? '未知';

        return `${city}今日天气：${desc}，温度 ${temp}°C，湿度 ${humidity}%，风速 ${wind}km/h。`;
      } catch (err: any) {
        return `查询 ${city} 天气失败: ${err.message}`;
      }
    },
    TTL,
  );
}