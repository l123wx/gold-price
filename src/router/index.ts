import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'

const pages = import.meta.glob('@/views/**/*.vue')

export default createRouter({
  routes: [
    {
      path: '/',
      redirect: '/index'
    },
    {
      path: '/index',
      name: 'Index',
      component: () => import('@/views/index.vue'),
      meta: {
        title: '金价监控',
        keepAlive: true
      }
    },
    ...Object.keys(pages).map((key) => {
      const pageName = key.match(/\/views\/(.+)\.vue$/)?.[1] || ''
      if (pageName.toLowerCase() === 'index') {
        return null as unknown as RouteRecordRaw
      }
      
      const name = pageName.split('/').pop() || pageName
      return {
        path: `/${pageName.toLowerCase()}`,
        name,
        component: pages[key],
      }
    }).filter(Boolean),
    {
      path: '/:pathMatch(.*)*',
      redirect: '/index',
    },
  ],
  history: createWebHashHistory(),
})
