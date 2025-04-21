<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import * as echarts from 'echarts'
import { ElMessage, ElButton, ElDialog, ElForm, ElFormItem, ElInputNumber, ElSwitch } from 'element-plus'
import { Setting } from '@element-plus/icons-vue'
import { getTodayPrices, getLatestPrice, GoldPriceChartData, LatestPriceData } from '@/api/goldPrice'

// 定义数据
const chartData = ref<GoldPriceChartData[]>([])
const latestPrice = ref<LatestPriceData | null>(null)
const chartContainer = ref<HTMLElement | null>(null)
const loading = ref(true)
const error = ref('')
const lastUpdateTime = ref<string>('')

// 图表状态跟踪
const hasInitializedRange = ref(false)

// 交易手续费设置
const dialogVisible = ref(false)
const sellingFeeForm = ref({
  fee: 0.0030, // 默认0.3%手续费
  highThreshold: 0, // 高阈值
  lowThreshold: 0,  // 低阈值
  highAlertEnabled: true, // 高阈值提醒启用状态
  lowAlertEnabled: true   // 低阈值提醒启用状态
})
const sellingFee = ref(localStorage.getItem('sellingFee') ? Number(localStorage.getItem('sellingFee')) : 0.0030)

// 价格阈值设置
const highThreshold = ref(localStorage.getItem('highThreshold') ? Number(localStorage.getItem('highThreshold')) : 0)
const lowThreshold = ref(localStorage.getItem('lowThreshold') ? Number(localStorage.getItem('lowThreshold')) : 0)
const highAlertEnabled = ref(localStorage.getItem('highAlertEnabled') !== 'false') // 默认启用
const lowAlertEnabled = ref(localStorage.getItem('lowAlertEnabled') !== 'false')   // 默认启用

// 提醒状态
const isPriceAlertActive = ref(false)
const alertDialogVisible = ref(false)
const alertType = ref<'high' | 'low' | null>(null)

// 计算今日最高价和最低价
const todayHighestPrice = computed(() => {
  if (!chartData.value || chartData.value.length === 0) return 0
  
  let highest = 0
  chartData.value.forEach(item => {
    const price = parseFloat(item.value[1])
    if (!isNaN(price) && (highest === 0 || price > highest)) {
      highest = price
    }
  })
  
  return highest
})

const todayLowestPrice = computed(() => {
  if (!chartData.value || chartData.value.length === 0) return 0
  
  let lowest = 0
  chartData.value.forEach(item => {
    const price = parseFloat(item.value[1])
    if (!isNaN(price) && (lowest === 0 || price < lowest)) {
      lowest = price
    }
  })
  
  return lowest
})

// 计算当前价格状态
const priceStatus = computed(() => {
  if (!latestPrice.value || !chartData.value || chartData.value.length === 0) {
    return 'normal'
  }
  
  const currentPrice = parseFloat(latestPrice.value.price)
  if (isNaN(currentPrice)) return 'normal'
  
  // 允许一点点精度误差（0.01）
  if (Math.abs(currentPrice - todayHighestPrice.value) < 0.01) {
    return 'highest'
  } else if (Math.abs(currentPrice - todayLowestPrice.value) < 0.01) {
    return 'lowest'
  } else {
    return 'normal'
  }
})

// 计算不亏损卖出价格
const noLossSellPrice = computed(() => {
  if (!latestPrice.value) return null
  
  const currentPrice = parseFloat(latestPrice.value.price)
  if (isNaN(currentPrice)) return null
  
  // 计算公式：当前金价 / (1 - 手续费)
  const price = currentPrice / (1 - sellingFee.value)
  return price.toFixed(2)
})

// 价格预警逻辑
const checkPriceAlert = () => {
  if (!latestPrice.value) return
  
  const currentPrice = parseFloat(latestPrice.value.price)
  if (isNaN(currentPrice)) return
  
  // 检查是否超出阈值且提醒已启用
  if (highAlertEnabled.value && highThreshold.value > 0 && currentPrice >= highThreshold.value) {
    // 触发高价预警
    isPriceAlertActive.value = true
    alertType.value = 'high'
    alertDialogVisible.value = true
    
    // 自动关闭高价提醒开关
    highAlertEnabled.value = false
    localStorage.setItem('highAlertEnabled', 'false')
  } else if (lowAlertEnabled.value && lowThreshold.value > 0 && currentPrice <= lowThreshold.value) {
    // 触发低价预警
    isPriceAlertActive.value = true
    alertType.value = 'low'
    alertDialogVisible.value = true
    
    // 自动关闭低价提醒开关
    lowAlertEnabled.value = false
    localStorage.setItem('lowAlertEnabled', 'false')
  }
}

// 确认已知晓预警
const acknowledgeAlert = () => {
  isPriceAlertActive.value = false
  alertDialogVisible.value = false
  alertType.value = null
}

// 保存手续费和阈值设置
const saveSettings = () => {
  // 验证手续费
  if (sellingFeeForm.value.fee < 0 || sellingFeeForm.value.fee > 0.1) {
    ElMessage.error('手续费应在0-10%范围内')
    return
  }
  
  // 保存手续费
  sellingFee.value = sellingFeeForm.value.fee
  localStorage.setItem('sellingFee', sellingFee.value.toString())
  
  // 保存阈值
  highThreshold.value = sellingFeeForm.value.highThreshold
  lowThreshold.value = sellingFeeForm.value.lowThreshold
  localStorage.setItem('highThreshold', highThreshold.value.toString())
  localStorage.setItem('lowThreshold', lowThreshold.value.toString())
  
  // 保存开关状态
  highAlertEnabled.value = sellingFeeForm.value.highAlertEnabled
  lowAlertEnabled.value = sellingFeeForm.value.lowAlertEnabled
  localStorage.setItem('highAlertEnabled', highAlertEnabled.value.toString())
  localStorage.setItem('lowAlertEnabled', lowAlertEnabled.value.toString())
  
  // 关闭弹窗
  dialogVisible.value = false
  ElMessage.success('设置已保存')
}

// 打开设置弹窗
const openSettingsDialog = () => {
  sellingFeeForm.value.fee = sellingFee.value
  
  // 如果用户之前没有设置过阈值，使用当前金价作为默认值
  if (latestPrice.value) {
    const currentPrice = parseFloat(latestPrice.value.price)
    if (!isNaN(currentPrice)) {
      // 如果高价阈值未设置，使用当前金价作为默认值
      if (highThreshold.value === 0) {
        // 高价默认为当前金价，便于用户基于当前价格进行调整
        sellingFeeForm.value.highThreshold = currentPrice
      } else {
        sellingFeeForm.value.highThreshold = highThreshold.value
      }
      
      // 如果低价阈值未设置，使用当前金价作为默认值
      if (lowThreshold.value === 0) {
        // 低价默认为当前金价，便于用户基于当前价格进行调整
        sellingFeeForm.value.lowThreshold = currentPrice
      } else {
        sellingFeeForm.value.lowThreshold = lowThreshold.value
      }
    } else {
      // 如果无法解析当前金价，使用已保存的值
      sellingFeeForm.value.highThreshold = highThreshold.value
      sellingFeeForm.value.lowThreshold = lowThreshold.value
    }
  } else {
    // 如果没有当前金价数据，使用已保存的值
    sellingFeeForm.value.highThreshold = highThreshold.value
    sellingFeeForm.value.lowThreshold = lowThreshold.value
  }
  
  // 设置开关状态
  sellingFeeForm.value.highAlertEnabled = highAlertEnabled.value
  sellingFeeForm.value.lowAlertEnabled = lowAlertEnabled.value
  
  dialogVisible.value = true
}

// 格式化百分比
const formatPercent = (value: number) => {
  return (value * 100).toFixed(2) + '%'
}

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
            {
              type: 'max',
              name: 'Max',
              itemStyle: {
                color: '#e04c4c55',
              },
              label: {
                color: '#000',
                fontWeight: 'bolder',
              }
            },
            {
              type: 'min',
              name: 'Min',
              itemStyle: {
                color: '#6cc14d55',
              },
              label: {
                color: '#000',
                fontWeight: 'bolder',
              }
            }
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

    // 判断是否需要初始化显示范围
    const isFirstUpdate = !hasInitializedRange.value;
    
    // 设置图表选项
    try {
      // 如果是首次更新，计算最近一小时数据的范围
      if (isFirstUpdate) {
        // 计算最近一小时数据的范围
        const endTime = finalData[finalData.length - 1][0]
        const oneHourAgo = endTime - 60 * 60 * 1000
        
        // 寻找最接近一小时前的数据点索引
        let startIndex = 0
        for (let i = 0; i < finalData.length; i++) {
          if (finalData[i][0] >= oneHourAgo) {
            startIndex = Math.max(0, i - 1) // 确保至少包含找到的那个点的前一个点
            break
          }
        }
        
        // 计算百分比位置
        const startPercent = (startIndex / finalData.length * 100)
        
        // 确保百分比在有效范围内
        const validStartPercent = Math.max(0, Math.min(90, startPercent))
        
        myChart.setOption({
          dataZoom: [
            {
              start: validStartPercent,
              end: 100
            },
            {
              start: validStartPercent,
              end: 100
            }
          ],
          series: [
            {
              data: finalData
            }
          ]
        }, false)  // 设置为false避免完全覆盖配置
        
        // 标记为已初始化
        hasInitializedRange.value = true;
        
        console.log('图表初始化显示最近一小时数据')
      } else {
        // 如果不是首次更新，只更新数据，不修改显示范围
        myChart.setOption({
          series: [
            {
              data: finalData
            }
          ]
        }, false)
        
        console.log('图表数据更新成功，保持当前显示范围')
      }
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
  } catch (err) {
    console.error('更新图表数据错误:', err)
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
      
      // 仅在初始化阶段进行图表初始化
      if (!myChart && chartContainer.value) {
        initChart()
      }
      
      // 更新图表数据 - updateChartData函数中已包含设置最近一小时数据的逻辑
      updateChartData()
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

// 监听价格变化
watch(() => latestPrice.value?.price, (newPrice) => {
  if (newPrice && !isPriceAlertActive.value) {
    checkPriceAlert()
  }
})

onMounted(async () => {
  try {
    // 加载保存的手续费设置
    const savedFee = localStorage.getItem('sellingFee')
    if (savedFee) {
      const feeValue = Number(savedFee)
      if (!isNaN(feeValue) && feeValue >= 0 && feeValue <= 0.1) {
        sellingFee.value = feeValue
      }
    }
    
    // 加载保存的阈值设置
    const savedHighThreshold = localStorage.getItem('highThreshold')
    if (savedHighThreshold) {
      const highValue = Number(savedHighThreshold)
      if (!isNaN(highValue) && highValue >= 0) {
        highThreshold.value = highValue
      }
    }
    
    const savedLowThreshold = localStorage.getItem('lowThreshold')
    if (savedLowThreshold) {
      const lowValue = Number(savedLowThreshold)
      if (!isNaN(lowValue) && lowValue >= 0) {
        lowThreshold.value = lowValue
      }
    }
    
    // 加载保存的提醒开关状态
    const savedHighEnabled = localStorage.getItem('highAlertEnabled')
    if (savedHighEnabled !== null) {
      highAlertEnabled.value = savedHighEnabled === 'true'
    }
    
    const savedLowEnabled = localStorage.getItem('lowAlertEnabled')
    if (savedLowEnabled !== null) {
      lowAlertEnabled.value = savedLowEnabled === 'true'
    }
    
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
  <div
    class="gold-price-container"
    :class="{ 
      'price-alert': isPriceAlertActive,
      'high-alert': alertType === 'high',
      'low-alert': alertType === 'low'
    }">
    <!-- 最新金价显示 -->
    <div 
      class="latest-price-display" 
      v-if="latestPrice && !error"
    >
      <div class="price-info">
        <div class="price-value-container">
          <span class="price-label">当前金价:</span>
          <span class="price-value" :class="{
            'price-highest': priceStatus === 'highest',
            'price-lowest': priceStatus === 'lowest'
          }">{{ latestPrice.price }}</span>
          <span class="price-unit">元/克</span>
        </div>
        <div class="price-change" :class="{ 'price-up': latestPrice.upAndDownAmt.startsWith('+'), 'price-down': latestPrice.upAndDownAmt.startsWith('-') }">
          {{ latestPrice.upAndDownAmt }} ({{ latestPrice.upAndDownRate }})
        </div>
        <div style="display: flex; gap: 10px; font-size: 0.9rem">
          <span>今日最低: <span style="color: #6cc14d;">{{ todayLowestPrice || '-' }}</span></span>
          <span>今日最高: <span style="color: #f26f6f;">{{ todayHighestPrice || '-' }}</span></span>
        </div>
      </div>
      <div style="height: 100%; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end;">
        <div class="update-time">
          最后更新: {{ lastUpdateTime }}
        </div>
        <div class="no-loss-price" v-if="noLossSellPrice">
          <span>盈亏平衡价: <strong>{{ noLossSellPrice }}</strong> 元/克</span>
          <span class="fee-info">(手续费: {{ formatPercent(sellingFee) }})</span>
          <el-button type="primary" link size="small" :icon="Setting" class="settings-btn" @click="openSettingsDialog">
            设置
          </el-button>
        </div>
        <div class="threshold-info" v-if="highThreshold > 0 || lowThreshold > 0">
          <span v-if="highThreshold > 0" :class="{ 'threshold-disabled': !highAlertEnabled }">
            高价警报: <strong>{{ highThreshold }}</strong> 元/克
            <span v-if="!highAlertEnabled">(已关闭)</span>
          </span>
          <span v-if="lowThreshold > 0" :class="{ 'threshold-disabled': !lowAlertEnabled }">
            低价警报: <strong>{{ lowThreshold }}</strong> 元/克
            <span v-if="!lowAlertEnabled">(已关闭)</span>
          </span>
        </div>
      </div>
    </div>

    <!-- 图表容器 -->
    <div ref="chartContainer" style="height: calc(100vh - 150px); width: 100%;"></div>
    
    <!-- 设置弹窗 -->
    <el-dialog v-model="dialogVisible" title="交易设置" width="300px" align-center>
      <el-form :model="sellingFeeForm" label-position="top">
        <el-form-item label="卖出手续费 (%)">
          <el-input-number
            v-model="sellingFeeForm.fee"
            :precision="4"
            :step="0.0005"
            :min="0"
            :max="0.1"
            :controls="true"
            style="width: 100%"
          />
          <div class="fee-hint">请输入0-10%之间的手续费比例，例如0.3%输入0.003</div>
        </el-form-item>
        
        <el-form-item class="threshold-item">
          <template #label>
            <div class="threshold-label">
              <span>最高价阈值 (元/克)</span>
              <el-switch
                v-model="sellingFeeForm.highAlertEnabled"
                active-color="#e04c4c"
                inactive-color="#dcdfe6"
                class="threshold-switch"
              />
            </div>
          </template>
          <el-input-number
            v-model="sellingFeeForm.highThreshold"
            :precision="2"
            :step="0.01"
            :min="0"
            :max="9999"
            :controls="true"
            :disabled="!sellingFeeForm.highAlertEnabled"
            style="width: 100%"
          />
          <div class="fee-hint">价格高于此值时将提醒，设为0则不提醒</div>
        </el-form-item>
        
        <el-form-item class="threshold-item">
          <template #label>
            <div class="threshold-label">
              <span>最低价阈值 (元/克)</span>
              <el-switch
                v-model="sellingFeeForm.lowAlertEnabled"
                active-color="#2e8b57"
                inactive-color="#dcdfe6"
                class="threshold-switch"
              />
            </div>
          </template>
          <el-input-number
            v-model="sellingFeeForm.lowThreshold"
            :precision="2"
            :step="0.01"
            :min="0"
            :max="9999"
            :controls="true"
            :disabled="!sellingFeeForm.lowAlertEnabled"
            style="width: 100%"
          />
          <div class="fee-hint">价格低于此值时将提醒，设为0则不提醒</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveSettings">确认</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 价格提醒弹窗 -->
    <el-dialog
      v-model="alertDialogVisible"
      :title="alertType === 'high' ? '价格已达到设定高值!' : '价格已达到设定低值!'"
      width="30%"
      align-center
      :modal="false"
      :show-close="false"
    >
      <div class="alert-content">
        <p v-if="alertType === 'high'">
          当前金价 <strong>{{ latestPrice?.price }}</strong> 元/克 <br/>
          已达到高价阈值
          <strong>{{ highThreshold }}</strong> 元/克
        </p>
        <p v-else-if="alertType === 'low'">
          当前金价 <strong>{{ latestPrice?.price }}</strong> 元/克 <br/>
          已达到低价阈值 
          <strong>{{ lowThreshold }}</strong> 元/克
        </p>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button type="primary" @click="acknowledgeAlert">我知道了</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.latest-price-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
  transition: background-color 0.3s ease;
  height: 120px;
}

/* 价格警报闪烁效果 */
@keyframes highPriceAlert {
  0% { background-color: transparent; }
  50% { background-color: rgba(255, 50, 50, 0.6); } /* 更鲜艳的红色，提高不透明度 */
  100% { background-color: transparent; }
}

@keyframes lowPriceAlert {
  0% { background-color: transparent; }
  50% { background-color: rgba(0, 210, 90, 0.6); } /* 更鲜艳的绿色，提高不透明度 */
  100% { background-color: transparent; }
}

.price-alert.high-alert {
  animation: highPriceAlert 1.5s ease-in-out infinite;
}

.price-alert.low-alert {
  animation: lowPriceAlert 1.5s ease-in-out infinite;
}

.price-info {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
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
  line-height: 24px;
  font-weight: bold;
  color: #e0962e;
}

/* 最高价和最低价的特殊颜色 */
.price-highest {
  color: #f26f6f; /* 鲜艳的红色表示最高价 */
  animation: priceHighlight 1.5s ease-in-out infinite;
}

.price-lowest {
  color: #6cc14d; /* 鲜艳的绿色表示最低价 */
  animation: priceHighlight 1.5s ease-in-out infinite;
}

/* 价格突出显示动画 */
@keyframes priceHighlight {
  0% { text-shadow: 0 0 0px currentColor; }
  50% { text-shadow: 0 0 10px currentColor; }
  100% { text-shadow: 0 0 0px currentColor; }
}

.price-unit {
  font-size: 0.9rem;
  color: #666;
  margin-left: 5px;
}

.price-change {
  font-size: 1.1rem;
  line-height: 18px;
  font-weight: 500;
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

.no-loss-price {
  margin-top: 8px;
  font-size: 0.95rem;
  color: #444;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.no-loss-price strong {
  color: #e04c4c;
  font-weight: bold;
  margin: 0 2px;
}

.threshold-info {
  margin-top: 6px;
  font-size: 0.85rem;
  color: #666;
  display: flex;
  gap: 10px;
}

.threshold-info strong {
  font-weight: bold;
}

.threshold-disabled {
  color: #aaa;
  text-decoration: line-through;
}

.threshold-disabled strong {
  color: #aaa;
}

.fee-info {
  color: #888;
  font-size: 0.85rem;
  margin-left: 5px;
}

.settings-btn {
  font-size: 0.85rem;
  margin-left: 5px;
  padding: 0;
  height: auto;
}

.fee-hint {
  font-size: 0.8rem;
  color: #888;
  margin-top: 5px;
  line-height: 20px;
}

.threshold-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.threshold-switch {
  margin-left: 10px;
}

.threshold-item {
  margin-top: 15px;
}

.alert-content {
  text-align: center;
  font-size: 14px;
  margin: 20px 0;
}

.alert-content p {
  margin: 10px 0;
}

.alert-content strong {
  font-weight: bold;
  font-size: 1.2rem;
}
</style>
