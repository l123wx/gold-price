# 金价监控网页

金价接口会跨域，有需要的朋友自己拉到本地运行，通过 localhost 打开吧

 - 使用 echart 展示当天金价折线图
 - 使用 axios 进行接口请求
 - 页面初始化时获取折线图数据，初始化图表
 - 定时请求最新金价，获取最新金价，并且同步更新图表数据
 - 在显眼的地方展示实时金价数字
 - 可以设置高/低阈值，达到阈值会通过屏幕闪烁提醒
 - 实时查看盈亏平衡价格（以当前价格买入，卖出时除去手续费不亏本的价格）

## 接口

### 获取当天金价折线图数据

 - url: https://ms.jr.jd.com/gw/generic/hj/h5/m/todayPrices
 - 请求类型: POST
 - 请求参数: 无

#### 响应示例

```json
{
  "resultData": {
    "datas": [
      {
        "name": "2025-04-21 09:06:00",
        "value": [
          "2025-04-21 09:06:00",
          "799.37"
        ]
      },
      {
        "name": "2025-04-21 09:08:00",
        "value": [
          "2025-04-21 09:08:00",
          "799.86"
        ]
      },
    ],
    "status": "SUCCESS"
  },
  "success": true,
  "resultCode": 0,
  "resultMsg": "成功",
  "channelEncrypt": 0
}
```

### 获取最新金价

 - url: https://ms.jr.jd.com/gw/generic/hj/h5/m/latestPrice
 - 请求类型: POST
 - 请求参数: 无

#### 响应示例

```json
  {
    "resultData": {
      "datas": {
        "upAndDownRate": "+2.61%",
        "productSku": "P005",
        "demode": false,
        "priceNum": "EDF5E4E3CA8C8B7D7B4E5A233D9F01A6",
        "price": "808.95",
        "yesterdayPrice": "788.38",
        "upAndDownAmt": "+20.57",
        "time": "1745247178000",
        "id": 69633103
      },
      "status": "SUCCESS"
    },
    "success": true,
    "resultCode": 0,
    "resultMsg": "成功",
    "channelEncrypt": 0
  }
```