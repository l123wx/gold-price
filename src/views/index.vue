<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import { getTodayPrices, getLatestPrice, GoldPriceChartData, LatestPriceData } from '@/api/goldPrice'

// 定义数据
const chartData = ref<GoldPriceChartData[]>([])
const latestPrice = ref<LatestPriceData | null>(null)
const chartContainer = ref<HTMLElement | null>(null)
const loading = ref(true)
const error = ref('')
const lastUpdateTime = ref<string>('')

// 格式化日期时间
const formatDateTime = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

let myChart: echarts.ECharts;

// 初始化图表
const initChart = () => {
  myChart = echarts.init(chartContainer.value, null, {
    renderer: 'canvas',
  });

  const option: echarts.EChartsOption = {
    title: {
      text: '黄金价格走势图',
      left: 'center',
      top: '2%',
      textStyle: {
        color: '#333',
        fontSize: 18
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: function(params: any) {
        const time = params[0].value[0]
        const price = params[0].value[1]
        // 格式化时间显示
        const date = new Date(time);
        const formattedTime = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
        return `${formattedTime}<br/>价格: <b>${price}</b> 元/克`;
      },
      axisPointer: {
        animation: false
      }
    },
    grid: {
      left: '5%',
      right: '8%',
      bottom: '15%', // 增加底部空间以容纳滑块
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'time',
      splitLine: {
        show: false
      },
      axisLabel: {
        formatter: (value: number) => {
          const date = new Date(value)
          return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
        }
      }
    },
    yAxis: {
      type: 'value',
      scale: true,
      splitLine: {
        lineStyle: {
          type: 'dashed'
        }
      },
    },
    dataZoom: [
      {
        type: 'slider',
        show: true,
        xAxisIndex: 0,
        filterMode: 'filter',
        start: 80, // 默认显示最近20%的数据
        end: 100,
        bottom: 10,
        height: 20,
        borderColor: 'transparent',
        backgroundColor: 'rgba(180, 180, 180, 0.1)',
        dataBackground: {
          lineStyle: {
            color: '#e0962e'
          },
          areaStyle: {
            color: 'rgba(224, 150, 46, 0.3)'
          }
        },
        fillerColor: 'rgba(224, 150, 46, 0.2)',
        handleIcon: 'path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
        handleSize: '80%',
        handleStyle: {
          color: '#e0962e'
        },
        textStyle: {
          color: '#333'
        }
      },
      {
        type: 'inside',
        xAxisIndex: 0,
        start: 80,
        end: 100,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true
      }
    ],
    series: [
      {
        name: '金价',
        type: 'line',
        showSymbol: false,
        emphasis: {
          scale: true
        },
        markPoint: {
          data: [
            { type: 'max', name: 'Max' },
            { type: 'min', name: 'Min' }
          ]
        },
        markLine: {
          data: [
            { type: 'average', name: 'Avg' },
            { type: 'max', name: 'Max' },
            { type: 'min', name: 'Min' }
          ]
        },
        data: []
      }
    ]
  }

  option && myChart.setOption(option);
}

// 更新图表数据
const updateChartData = () => {
  try {
    // 确保图表和数据都存在
    if (!myChart) {
      console.warn('尝试更新数据但图表实例不存在')
      return
    }
    
    if (!chartData.value || chartData.value.length === 0) {
      console.warn('尝试更新空数据集')
      return
    }

    // 数据处理
    const seriesData = chartData.value.map(item => {
      try {
        if (!item || !item.value || item.value.length < 2) {
          return null
        }
        
        const timeStr = item.value[0]
        const price = item.value[1]

        // 尝试解析时间
        let time: number
        
        if (typeof timeStr === 'string') {
          // 尝试解析日期字符串
          time = new Date(timeStr).getTime()
        } else if (typeof timeStr === 'number') {
          // 如果已经是时间戳
          time = timeStr
        } else {
          return null
        }

        // 尝试解析价格
        const priceNum = parseFloat(price)

        if (isNaN(time) || isNaN(priceNum)) {
          return null
        }

        return [time, priceNum]
      } catch (e) {
        console.error('处理数据点错误:', e)
        return null
      }
    }).filter(item => item !== null) as [number, number][]

    if (seriesData.length === 0) {
      console.warn('处理后没有有效数据点')
      return
    }

    // 按时间排序
    seriesData.sort((a, b) => a[0] - b[0])

    // 限制数据点数量，避免性能问题
    const maxDataPoints = 500
    let finalData = seriesData
    if (seriesData.length > maxDataPoints) {
      // 如果数据点过多，取最近的maxDataPoints个点
      finalData = seriesData.slice(-maxDataPoints)
    }

    // 计算默认的dataZoom范围 - 显示最近一小时的数据
    let startValue = finalData[0][0]
    let endValue = finalData[finalData.length - 1][0]
    
    // 计算显示最后一小时数据的起始位置
    const oneHourAgo = endValue - 60 * 60 * 1000
    
    // 找到最接近一小时前的数据点
    let startIndex = 0
    for (let i = 0; i < finalData.length; i++) {
      if (finalData[i][0] >= oneHourAgo) {
        startIndex = Math.max(0, i - 1)
        break
      }
    }
    
    // 如果数据量不足一小时，则显示所有数据
    const startPercent = finalData.length <= 10 ? 0 : (startIndex / finalData.length * 100)
    
    // 设置图表选项
    try {
      myChart.setOption({
        series: [
          {
            data: finalData
          }
        ]
      }, false)  // 设置为false避免完全覆盖配置
    } catch (chartErr) {
      console.error('设置图表数据错误:', chartErr)
      // 尝试应用基本配置
      try {
        myChart.setOption({
          xAxis: { type: 'time' },
          yAxis: { type: 'value' },
          series: [{ type: 'line', data: finalData }]
        })
      } catch (fallbackErr) {
        console.error('应用基本图表配置失败:', fallbackErr)
      }
    }

    console.log('图表数据更新成功')
  } catch (err) {
    console.error('更新图表数据错误:', err)
  }
}

// 计算聚焦区域的起始索引
const calculateFocusRange = (data: [number, number][]): { start: number, end: number } => {
  if (!data || data.length === 0) {
    return { start: 0, end: 100 }
  }
  
  try {
    // 全天数据的时间范围
    const endTime = data[data.length - 1][0]
    
    // 计算一小时前的时间戳
    const oneHourAgo = endTime - 60 * 60 * 1000
    
    // 寻找一小时前的数据点索引
    let startIndex = 0
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] >= oneHourAgo) {
        startIndex = Math.max(0, i - 1)
        break
      }
    }
    
    // 如果数据点太少，显示全部
    if (data.length <= 10) {
      return { start: 0, end: 100 }
    }
    
    // 计算百分比位置
    const startPercent = Math.round(startIndex / data.length * 100)
    
    // 确保至少显示最后20%的数据
    const finalStart = Math.min(startPercent, 80)
    
    return { start: finalStart, end: 100 }
  } catch (err) {
    console.error('计算缩放范围错误:', err)
    return { start: 80, end: 100 } // 默认显示最后20%
  }
}

// 获取当天金价数据
const fetchTodayPrices = async () => {
  try {
    loading.value = true
    error.value = ''
    const response = await getTodayPrices()

    if (response.success && response.resultData.status === 'SUCCESS') {
      chartData.value = response.resultData.datas
      
      // 处理数据以设置适当的缩放范围
      const processedData = chartData.value.map(item => {
        try {
          const timeStr = item.value[0]
          const price = item.value[1]
          const time = new Date(timeStr).getTime()
          const priceNum = parseFloat(price)
          
          if (isNaN(time) || isNaN(priceNum)) {
            return null
          }
          
          return [time, priceNum]
        } catch (e) {
          return null
        }
      }).filter(item => item !== null) as [number, number][]
      
      // 排序数据
      processedData.sort((a, b) => a[0] - b[0])
      
      // 计算缩放范围
      const focusRange = calculateFocusRange(processedData)
      
      // 更新图表
      updateChartData()
      
      // 应用计算的缩放范围
      if (myChart) {
        myChart.setOption({
          dataZoom: [
            {
              start: focusRange.start,
              end: focusRange.end
            },
            {
              start: focusRange.start,
              end: focusRange.end
            }
          ]
        }, false)
      }
    } else {
      error.value = response.resultMsg || '获取金价数据失败'
    }
  } catch (err) {
    error.value = '获取金价数据失败，请稍后再试'
    console.error('获取金价数据错误:', err)
  } finally {
    loading.value = false
  }
}

// 获取最新金价
const fetchLatestPrice = async () => {
  try {
    // 不设置全局loading，避免影响用户体验
    const response = await getLatestPrice()

    if (response.success && response.resultData.status === 'SUCCESS') {
      // 清除错误状态
      error.value = ''
      latestPrice.value = response.resultData.datas
      lastUpdateTime.value = formatDateTime(new Date())

      // 如果有新数据，添加到图表数据中
      if (latestPrice.value) {
        try {
          // 解析时间戳（毫秒）
          let timestamp = parseInt(latestPrice.value.time)
          if (isNaN(timestamp)) throw new Error('Invalid timestamp')

          // 检查时间戳长度，确保正确的毫秒时间戳
          // 有些API返回的是秒级时间戳，需要转换为毫秒
          if (timestamp < 10000000000) {
            timestamp *= 1000
          }

          const date = new Date(timestamp)
          if (isNaN(date.getTime())) throw new Error('Invalid date')

          // 格式化为标准时间字符串
          const time = formatDateTime(date)
          const price = latestPrice.value.price

          // 检查是否已存在相同时间的数据点
          const existingIndex = chartData.value.findIndex(item => item.name === time)

          if (existingIndex === -1) {
            // 添加新数据点
            chartData.value.push({
              name: time,
              value: [time, price]
            })
            updateChartData()
          } else if (chartData.value[existingIndex].value[1] !== price) {
            // 更新已存在的数据点
            chartData.value[existingIndex].value[1] = price
            updateChartData()
          }
        } catch (err) {
          console.error('处理最新金价数据错误:', err)
        }
      }
    }
  } catch (err) {
    console.error('获取最新金价错误:', err)
    // 不在最新金价获取失败时显示错误，只在控制台输出
  }
}

// 定时器
let timer: number | null = null

// 递归请求函数 - 等待上一个请求完成后再发起下一个
const scheduleFetchLatestPrice = async () => {
  try {
    // 执行请求
    await fetchLatestPrice()
    
    // 请求完成后，设置下一次请求的延迟
    timer = window.setTimeout(scheduleFetchLatestPrice, 1000)
  } catch (err) {
    console.error('定时请求出错:', err)
    // 发生错误时也继续下一次请求
    timer = window.setTimeout(scheduleFetchLatestPrice, 1000)
  }
}

// 定义resize处理函数
const handleResize = () => {
  if (myChart) {
    myChart.resize()
  }
}

onMounted(async () => {
  try {
    // 获取初始数据
    await fetchTodayPrices()
    
    // 应用完整图表配置
    initChart()

    // 获取最新金价
    await fetchLatestPrice()

    // 使用递归定时器，确保请求按顺序执行
    scheduleFetchLatestPrice()
  } catch (err) {
    console.error('初始化页面错误:', err)
    error.value = '页面加载失败，请刷新重试'
  }

  // 监听resize事件
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  // 清除定时器
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }

  // 移除事件监听
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="gold-price-container">
    <!-- 最新金价显示 -->
    <div class="latest-price-display" v-if="latestPrice && !error">
      <div class="price-info">
        <div class="price-value-container">
          <span class="price-label">当前金价:</span>
          <span class="price-value">{{ latestPrice.price }}</span>
          <span class="price-unit">元/克</span>
        </div>
        <div class="price-change" :class="{ 'price-up': latestPrice.upAndDownAmt.startsWith('+'), 'price-down': latestPrice.upAndDownAmt.startsWith('-') }">
          {{ latestPrice.upAndDownAmt }} ({{ latestPrice.upAndDownRate }})
        </div>
      </div>
      <div class="update-time">
        最后更新: {{ lastUpdateTime }}
      </div>
    </div>

    <!-- 图表容器 -->
    <div ref="chartContainer" style="height: calc(100vh - 120px); width: 100%;"></div>
  </div>
</template>

<style scoped>
.latest-price-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background-color: #fff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
}

.price-info {
  display: flex;
  flex-direction: column;
}

.price-value-container {
  display: flex;
  align-items: baseline;
}

.price-label {
  font-size: 1rem;
  color: #666;
  margin-right: 8px;
}

.price-value {
  font-size: 2.2rem;
  font-weight: bold;
  color: #e0962e;
}

.price-unit {
  font-size: 0.9rem;
  color: #666;
  margin-left: 5px;
}

.price-change {
  font-size: 1.1rem;
  font-weight: 500;
  margin-top: 5px;
}

.price-up {
  color: #e04c4c;
}

.price-down {
  color: #2e8b57;
}

.update-time {
  font-size: 0.8rem;
  color: #888;
}

.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(224, 150, 46, 0.2);
  border-radius: 50%;
  border-top-color: #e0962e;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(255, 235, 238, 0.9);
  color: #c62828;
  padding: 15px 20px;
  border-radius: 4px;
  font-size: 1rem;
  z-index: 10;
  max-width: 80%;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>
