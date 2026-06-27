// 查询指定城市的天气（目前 mock，后续可接真实 API）
export async function getWeather(city: string): Promise<string> {
  const mockData: Record<string, string> = {
    '北京': '晴，25°C，湿度 45%，风力 2级',
    '上海': '多云，28°C，湿度 60%，风力 3级',
    '深圳': '阵雨，30°C，湿度 75%，风力 4级',
    '杭州': '阴，22°C，湿度 55%，风力 2级',
    '广州': '雷阵雨，32°C，湿度 80%，风力 3级',
    '成都': '小雨，20°C，湿度 70%，风力 1级',
  };
  const result = mockData[city];
  if (result) return `${city}今日天气：${result}`;
  return `${city}今日天气：晴转多云，22-30°C，风力 3级`;
}
