import axios from 'axios'

// 定义接口返回数据类型
export interface GoldPriceChartData {
  name: string
  value: [string, string]
}

export interface GoldPriceChartResponse {
  resultData: {
    datas: GoldPriceChartData[]
    status: string
  }
  success: boolean
  resultCode: number
  resultMsg: string
  channelEncrypt: number
}

export interface LatestPriceData {
  upAndDownRate: string
  productSku: string
  demode: boolean
  priceNum: string
  price: string
  yesterdayPrice: string
  upAndDownAmt: string
  time: string
  id: number
}

export interface LatestPriceResponse {
  resultData: {
    datas: LatestPriceData
    status: string
  }
  success: boolean
  resultCode: number
  resultMsg: string
  channelEncrypt: number
}

// 获取当天金价折线图数据
export async function getTodayPrices(): Promise<GoldPriceChartResponse> {
  const response = await axios.post('api/todayPrices')
  return response.data
}

// 获取最新金价
export async function getLatestPrice(): Promise<LatestPriceResponse> {
  const response = await axios.post('api/latestPrice')
  return response.data
}
