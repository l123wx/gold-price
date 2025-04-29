# 金价监控网页

**金价接口会跨域，有需要的朋友自己拉到本地运行，通过 localhost 打开吧**

 - 使用 echart 展示当天金价折线图
 - 定时请求最新金价，获取最新金价，并且同步更新图表数据
 - 在显眼的地方展示实时金价数字
 - 可以设置高/低阈值，达到阈值会通过屏幕闪烁提醒
 - 实时查看盈亏平衡价格（以当前价格买入，卖出时除去手续费不亏本的价格）

## 如何启动

1.克隆代码到本地

```shell
git clone https://github.com/l123wx/gold-price.git
```

2.进入项目目录

```shell
cd gold-price
```

3.安装依赖

```shell
pnpm i
```

4.运行项目

```shell
pnpm dev
```

## 接口

来源：京东金融

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

## 免责声明

### 数据来源
本项目展示的黄金价格数据来自京东金融公开API，仅供参考。实际交易价格可能因各种因素而有所不同。

### 使用风险
- 本工具仅作为信息参考，不构成任何投资建议
- 黄金价格波动受多种因素影响，存在不可预测性
- 使用本工具进行投资决策的风险由用户自行承担
- 价格提醒功能仅作为辅助工具，不保证100%准确或及时

### 数据准确性
尽管我们努力确保数据的准确性，但不对数据的完整性、及时性和准确性做出任何保证。用户在做出任何投资决策前应自行验证信息。

### 责任限制
开发者不对用户因使用本工具而产生的任何直接或间接损失负责，包括但不限于投资损失、数据丢失等。
