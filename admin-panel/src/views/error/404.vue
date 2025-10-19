<template>
  <div class="error-container">
    <!-- 主要内容 -->
    <div class="error-content">
      <!-- SVG动态插图 -->
      <div class="error-illustration">
        <svg class="not-found-svg" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <!-- 渐变定义 -->

            <linearGradient id="numberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#3b82f6"/>
              <stop offset="100%" style="stop-color:#1e40af"/>
            </linearGradient>

            <linearGradient id="characterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#fbbf24"/>
              <stop offset="100%" style="stop-color:#f59e0b"/>
            </linearGradient>

            <linearGradient id="laptopGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#e5e7eb"/>
              <stop offset="100%" style="stop-color:#d1d5db"/>
            </linearGradient>

            <!-- 漂流瓶渐变定义 -->
            <linearGradient id="seaBottleMain" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#ecfeff" stop-opacity="0.15"/>
              <stop offset="25%" style="stop-color:#cffafe" stop-opacity="0.25"/>
              <stop offset="50%" style="stop-color:#a7f3d0" stop-opacity="0.2"/>
              <stop offset="75%" style="stop-color:#6ee7b7" stop-opacity="0.18"/>
              <stop offset="100%" style="stop-color:#34d399" stop-opacity="0.12"/>
            </linearGradient>

            <linearGradient id="seaBottleStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#0891b2"/>
              <stop offset="50%" style="stop-color:#0e7490"/>
              <stop offset="100%" style="stop-color:#155e75"/>
            </linearGradient>

            <linearGradient id="seaGlassHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#ffffff" stop-opacity="0.8"/>
              <stop offset="40%" style="stop-color:#f0fdfa" stop-opacity="0.5"/>
              <stop offset="100%" style="stop-color:#ccfbf1" stop-opacity="0.2"/>
            </linearGradient>

            <linearGradient id="corkCap" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#92400e"/>
              <stop offset="30%" style="stop-color:#a16207"/>
              <stop offset="70%" style="stop-color:#ca8a04"/>
              <stop offset="100%" style="stop-color:#eab308"/>
            </linearGradient>

            <radialGradient id="seaBottomReflection" cx="50%" cy="40%" r="70%">
              <stop offset="0%" style="stop-color:#ffffff" stop-opacity="0.4"/>
              <stop offset="60%" style="stop-color:#a7f3d0" stop-opacity="0.2"/>
              <stop offset="100%" style="stop-color:#059669" stop-opacity="0.05"/>
            </radialGradient>

            <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#0891b2" stop-opacity="0.3"/>
              <stop offset="50%" style="stop-color:#06b6d4" stop-opacity="0.2"/>
              <stop offset="100%" style="stop-color:#22d3ee" stop-opacity="0.1"/>
            </linearGradient>

            <!-- 海洋气泡渐变 -->
            <radialGradient id="bubbleGradient" cx="30%" cy="30%" r="70%">
              <stop offset="0%" style="stop-color:#ffffff" stop-opacity="0.9"/>
              <stop offset="40%" style="stop-color:#e0f7fa" stop-opacity="0.6"/>
              <stop offset="70%" style="stop-color:#06b6d4" stop-opacity="0.3"/>
              <stop offset="100%" style="stop-color:#0891b2" stop-opacity="0.1"/>
            </radialGradient>

            <!-- 阳光渐变 -->
            <linearGradient id="sunlightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#fef3c7" stop-opacity="0.6"/>
              <stop offset="30%" style="stop-color:#fde68a" stop-opacity="0.4"/>
              <stop offset="70%" style="stop-color:#facc15" stop-opacity="0.2"/>
              <stop offset="100%" style="stop-color:#eab308" stop-opacity="0.1"/>
            </linearGradient>

            <!-- 清晰透明玻璃主体渐变 -->
            <radialGradient id="realGlassGradient" cx="30%" cy="40%" r="80%">
              <stop offset="0%" style="stop-color:#ffffff" stop-opacity="0.08"/>
              <stop offset="30%" style="stop-color:#f8fafc" stop-opacity="0.12"/>
              <stop offset="60%" style="stop-color:#f1f5f9" stop-opacity="0.15"/>
              <stop offset="80%" style="stop-color:#e2e8f0" stop-opacity="0.2"/>
              <stop offset="100%" style="stop-color:#cbd5e1" stop-opacity="0.25"/>
            </radialGradient>

            <!-- 清晰可见玻璃边缘渐变 -->
            <linearGradient id="glassOuterEdge" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#64748b" stop-opacity="0.7"/>
              <stop offset="50%" style="stop-color:#475569" stop-opacity="0.6"/>
              <stop offset="100%" style="stop-color:#334155" stop-opacity="0.8"/>
            </linearGradient>

            <!-- 清晰透明玻璃内层渐变 -->
            <radialGradient id="glassInnerLayer" cx="40%" cy="30%" r="70%">
              <stop offset="0%" style="stop-color:#ffffff" stop-opacity="0.05"/>
              <stop offset="50%" style="stop-color:#f8fafc" stop-opacity="0.08"/>
              <stop offset="100%" style="stop-color:#f1f5f9" stop-opacity="0.12"/>
            </radialGradient>

            <!-- 清晰可见玻璃厚度阴影 -->
            <linearGradient id="glassThicknessShadow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#475569" stop-opacity="0.6"/>
              <stop offset="50%" style="stop-color:#64748b" stop-opacity="0.4"/>
              <stop offset="100%" style="stop-color:#94a3b8" stop-opacity="0.3"/>
            </linearGradient>

            <!-- 透明玻璃色散效果 -->
            <linearGradient id="glassDispersion" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#ff6b6b" stop-opacity="0.03"/>
              <stop offset="25%" style="stop-color:#feca57" stop-opacity="0.025"/>
              <stop offset="50%" style="stop-color:#48dbfb" stop-opacity="0.02"/>
              <stop offset="75%" style="stop-color:#ff9ff3" stop-opacity="0.015"/>
              <stop offset="100%" style="stop-color:#54a0ff" stop-opacity="0.01"/>
            </linearGradient>

            <!-- 瓶内海水渐变 -->
            <linearGradient id="seaWaterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#06b6d4" stop-opacity="0.3"/>
              <stop offset="50%" style="stop-color:#0891b2" stop-opacity="0.4"/>
              <stop offset="100%" style="stop-color:#0e7490" stop-opacity="0.5"/>
            </linearGradient>

            <!-- 玻璃折射沙子渐变 -->
            <linearGradient id="refractedSandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#fbbf24" stop-opacity="0.85"/>
              <stop offset="30%" style="stop-color:#f59e0b" stop-opacity="0.75"/>
              <stop offset="60%" style="stop-color:#d97706" stop-opacity="0.65"/>
              <stop offset="100%" style="stop-color:#ea580c" stop-opacity="0.55"/>
            </linearGradient>

            <!-- 玻璃内部阴影滤镜 -->
            <filter id="glassInteriorShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
              <feOffset dx="1" dy="2" result="offset"/>
              <feFlood flood-color="#0891b2" flood-opacity="0.2"/>
              <feComposite in2="offset" operator="in"/>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            <!-- 玻璃折射效果滤镜 -->
            <filter id="glassRefraction" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence baseFrequency="0.02" numOctaves="2" result="noise"/>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.8"/>
            </filter>

            <!-- 真实玻璃边缘滤镜 -->
            <filter id="glassEdgeEffect" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blur"/>
              <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#22d3ee" flood-opacity="0.3"/>
            </filter>

            <!-- 玻璃焦散效果滤镜 -->
            <filter id="glassCaustics" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="glow"/>
              <feColorMatrix in="glow" values="0 0 0 0 0.8 0 0 0 0 0.9 0 0 0 0 1 0 0 0 0.6 0"/>
            </filter>

            <!-- 阴影滤镜 -->
            <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.1"/>
            </filter>
          </defs>

          <!-- 透明背景 -->
          <rect width="800" height="600" fill="transparent"/>

          <!-- 大号404数字 -->
          <g class="large-numbers" transform="translate(400,120)">
            <text x="0" y="0" text-anchor="middle" font-family="'Arial Black', Arial, sans-serif"
                  font-size="120" font-weight="900" fill="url(#numberGradient)" opacity="0.9">
              404
              <animate attributeName="opacity" values="0.9;1;0.9" dur="3s" repeatCount="indefinite"/>
            </text>
            <!-- 数字阴影 -->
            <text x="3" y="3" text-anchor="middle" font-family="'Arial Black', Arial, sans-serif"
                  font-size="120" font-weight="900" fill="#000000" opacity="0.1" style="z-index: -1;">
              404
            </text>
          </g>

          <!-- 海洋漂流瓶场景 -->
          <g class="ocean-drift-scene" transform="translate(400,370)">

            <!-- 丰富的海洋波浪背景 -->
            <g class="ocean-waves">
              <!-- 远景波浪层 -->
              <path d="M-350,-50 Q-300,-65 -250,-50 Q-200,-35 -150,-50 Q-100,-65 -50,-50 Q0,-35 50,-50 Q100,-65 150,-50 Q200,-35 250,-50 Q300,-65 350,-50 L350,50 L-350,50 Z"
                    fill="url(#waveGradient)" opacity="0.25" class="wave-bg">
                <animateTransform attributeName="transform" type="translate" values="-25,0; 25,0; -25,0" dur="12s" repeatCount="indefinite"/>
              </path>

              <!-- 远景波浪纹理 -->
              <path d="M-350,-45 Q-280,-55 -210,-45 Q-140,-35 -70,-45 Q0,-55 70,-45 Q140,-35 210,-45 Q280,-55 350,-45 L350,50 L-350,50 Z"
                    fill="url(#waveGradient)" opacity="0.15" class="wave-texture">
                <animateTransform attributeName="transform" type="translate" values="30,0; -30,0; 30,0" dur="15s" repeatCount="indefinite"/>
              </path>

              <!-- 中景波浪 -->
              <path d="M-350,-20 Q-280,-35 -210,-20 Q-140,-5 -70,-20 Q0,-35 70,-20 Q140,-5 210,-20 Q280,-35 350,-20 L350,50 L-350,50 Z"
                    fill="url(#waveGradient)" opacity="0.35" class="wave-mid">
                <animateTransform attributeName="transform" type="translate" values="18,0; -18,0; 18,0" dur="8s" repeatCount="indefinite"/>
              </path>

              <!-- 中景波峰 -->
              <path d="M-350,-15 Q-250,-25 -150,-15 Q-50,-5 50,-15 Q150,-25 250,-15 Q300,-10 350,-15 L350,50 L-350,50 Z"
                    fill="url(#waveGradient)" opacity="0.2" class="wave-crest">
                <animateTransform attributeName="transform" type="translate" values="-12,0; 12,0; -12,0" dur="6s" repeatCount="indefinite"/>
              </path>

              <!-- 近景波浪 -->
              <path d="M-350,10 Q-250,-5 -150,10 Q-50,25 50,10 Q150,-5 250,10 Q300,20 350,10 L350,50 L-350,50 Z"
                    fill="url(#waveGradient)" opacity="0.45" class="wave-front">
                <animateTransform attributeName="transform" type="translate" values="-8,0; 8,0; -8,0" dur="5s" repeatCount="indefinite"/>
              </path>

              <!-- 海面泡沫和浪花 -->
              <g class="sea-foam" opacity="0.3">
                <!-- 大浪花 -->
                <ellipse cx="-200" cy="12" rx="15" ry="4" fill="#ffffff" opacity="0.6">
                  <animateTransform attributeName="transform" type="translate" values="0,0; 40,0; 0,0" dur="20s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.6;0.3;0.6;0.8;0.6" dur="20s" repeatCount="indefinite"/>
                </ellipse>
                <ellipse cx="180" cy="8" rx="12" ry="3" fill="#ffffff" opacity="0.5">
                  <animateTransform attributeName="transform" type="translate" values="0,0; -35,0; 0,0" dur="18s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.5;0.2;0.5;0.7;0.5" dur="18s" repeatCount="indefinite"/>
                </ellipse>

                <!-- 中型泡沫 -->
                <circle cx="-150" cy="15" r="6" fill="#ffffff" opacity="0.4">
                  <animateTransform attributeName="transform" type="translate" values="0,0; 25,2; 0,0" dur="15s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.4;0.1;0.4;0.6;0.4" dur="15s" repeatCount="indefinite"/>
                </circle>
                <circle cx="120" cy="18" r="4" fill="#ffffff" opacity="0.3">
                  <animateTransform attributeName="transform" type="translate" values="0,0; -20,-1; 0,0" dur="12s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.3;0.05;0.3;0.5;0.3" dur="12s" repeatCount="indefinite"/>
                </circle>

                <!-- 小泡沫群 -->
                <circle cx="-80" cy="22" r="2" fill="#ffffff" opacity="0.5">
                  <animateTransform attributeName="transform" type="translate" values="0,0; 15,1; 0,0" dur="8s" repeatCount="indefinite"/>
                </circle>
                <circle cx="60" cy="25" r="1.5" fill="#ffffff" opacity="0.4">
                  <animateTransform attributeName="transform" type="translate" values="0,0; -12,0; 0,0" dur="10s" repeatCount="indefinite"/>
                </circle>
                <circle cx="-30" cy="28" r="2.5" fill="#ffffff" opacity="0.3">
                  <animateTransform attributeName="transform" type="translate" values="0,0; 8,-1; 0,0" dur="7s" repeatCount="indefinite"/>
                </circle>
              </g>

              <!-- 水流纹理 -->
              <g class="current-flow" opacity="0.15">
                <path d="M-120,0 Q-60,5 0,0 Q60,-5 120,0" stroke="#06b6d4" stroke-width="1.2" fill="none">
                  <animateTransform attributeName="transform" type="translate"
                                    values="0,0; 25,4; 0,0; -20,-3; 0,0" dur="12s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.15;0.35;0.15;0.08;0.15" dur="12s" repeatCount="indefinite"/>
                </path>
                <path d="M-100,15 Q-50,20 0,15 Q50,10 100,15" stroke="#0891b2" stroke-width="1" fill="none">
                  <animateTransform attributeName="transform" type="translate"
                                    values="0,0; -30,-2; 0,0; 22,3; 0,0" dur="14s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.15;0.25;0.15;0.05;0.15" dur="14s" repeatCount="indefinite"/>
                </path>
                <path d="M-80,-10 Q-40,-5 0,-10 Q40,-15 80,-10" stroke="#22d3ee" stroke-width="0.8" fill="none">
                  <animateTransform attributeName="transform" type="translate"
                                    values="0,0; 18,-4; 0,0; -25,2; 0,0" dur="16s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.15;0.3;0.15;0.1;0.15" dur="16s" repeatCount="indefinite"/>
                </path>

                <!-- 深层水流 -->
                <path d="M-140,30 Q-70,35 0,30 Q70,25 140,30" stroke="#0e7490" stroke-width="0.6" fill="none" opacity="0.2">
                  <animateTransform attributeName="transform" type="translate"
                                    values="0,0; -15,2; 0,0; 28,-1; 0,0" dur="20s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.2;0.4;0.2;0.1;0.2" dur="20s" repeatCount="indefinite"/>
                </path>
              </g>

              <!-- 海面反光效果 -->
              <g class="surface-reflections" opacity="0.2">
                <ellipse cx="-100" cy="5" rx="20" ry="3" fill="#38bdf8" opacity="0.4" transform="rotate(-15)">
                  <animate attributeName="opacity" values="0.4;0.8;0.4;0.1;0.4" dur="6s" repeatCount="indefinite"/>
                  <animateTransform attributeName="transform" type="translate" values="0,0; 50,2; 0,0" dur="25s" repeatCount="indefinite" additive="sum"/>
                </ellipse>
                <ellipse cx="80" cy="12" rx="15" ry="2" fill="#0ea5e9" opacity="0.5" transform="rotate(20)">
                  <animate attributeName="opacity" values="0.5;0.9;0.5;0.15;0.5" dur="7s" repeatCount="indefinite"/>
                  <animateTransform attributeName="transform" type="translate" values="0,0; -40,-1; 0,0" dur="22s" repeatCount="indefinite" additive="sum"/>
                </ellipse>
                <ellipse cx="0" cy="8" rx="12" ry="2.5" fill="#0284c7" opacity="0.3" transform="rotate(-10)">
                  <animate attributeName="opacity" values="0.3;0.7;0.3;0.05;0.3" dur="5s" repeatCount="indefinite"/>
                  <animateTransform attributeName="transform" type="translate" values="0,0; 30,3; 0,0" dur="18s" repeatCount="indefinite" additive="sum"/>
                </ellipse>
              </g>
            </g>

            <!-- 漂流物品和海洋杂物 -->
            <g class="floating-debris">
              <!-- 漂浮的木板 -->
              <rect x="-280" y="-15" width="25" height="4" rx="2" fill="#8b4513" opacity="0.7" class="debris-float">
                <animateTransform attributeName="transform" type="translate" values="0,0; 8,-3; 0,0; -5,2; 0,0" dur="7s" repeatCount="indefinite"/>
              </rect>

              <!-- 海藻 -->
              <path d="M-320,20 Q-315,5 -320,-10 Q-325,0 -320,-15" stroke="#065f46" stroke-width="3" fill="none" opacity="0.6" class="seaweed-drift">
                <animateTransform attributeName="transform" type="rotate" values="0,-320,20; 8,-320,20; 0,-320,20; -5,-320,20; 0,-320,20" dur="5s" repeatCount="indefinite"/>
              </path>

              <!-- 右侧浮木 -->
              <ellipse cx="290" cy="5" rx="15" ry="3" fill="#a16207" opacity="0.5" class="drift-wood">
                <animateTransform attributeName="transform" type="translate" values="0,0; -6,1; 0,0; 4,-2; 0,0" dur="6.5s" repeatCount="indefinite"/>
              </ellipse>

              <!-- 海鸟羽毛 -->
              <path d="M250,-35 Q255,-40 260,-35 Q255,-30 250,-35" fill="#f3f4f6" opacity="0.7" class="feather-float">
                <animateTransform attributeName="transform" type="translate" values="0,0; -3,-8; 0,0; 2,4; 0,0" dur="4s" repeatCount="indefinite"/>
              </path>
            </g>

            <!-- 海洋泡沫和气泡群 -->
            <g class="sea-foam-bubbles">
              <!-- 大型海洋气泡群 -->
              <g class="bubble-cluster-left">
                <circle cx="-180" cy="-40" r="6" fill="url(#bubbleGradient)" opacity="0.4" class="sea-bubble">
                  <animateTransform attributeName="transform" type="translate" values="0,0; 2,-15; 0,0" dur="5s" repeatCount="indefinite"/>
                </circle>
                <circle cx="-175" cy="-35" r="3" fill="url(#bubbleGradient)" opacity="0.6" class="sea-bubble">
                  <animateTransform attributeName="transform" type="translate" values="0,0; 1,-12; 0,0" dur="4s" repeatCount="indefinite"/>
                </circle>
                <circle cx="-185" cy="-30" r="4" fill="url(#bubbleGradient)" opacity="0.5" class="sea-bubble">
                  <animateTransform attributeName="transform" type="translate" values="0,0; 3,-18; 0,0" dur="6s" repeatCount="indefinite"/>
                </circle>
              </g>

              <g class="bubble-cluster-right">
                <circle cx="170" cy="-45" r="5" fill="url(#bubbleGradient)" opacity="0.5" class="sea-bubble">
                  <animateTransform attributeName="transform" type="translate" values="0,0; -2,-14; 0,0" dur="4.5s" repeatCount="indefinite"/>
                </circle>
                <circle cx="175" cy="-38" r="2.5" fill="url(#bubbleGradient)" opacity="0.7" class="sea-bubble">
                  <animateTransform attributeName="transform" type="translate" values="0,0; -1,-10; 0,0" dur="3.5s" repeatCount="indefinite"/>
                </circle>
                <circle cx="180" cy="-42" r="3.5" fill="url(#bubbleGradient)" opacity="0.4" class="sea-bubble">
                  <animateTransform attributeName="transform" type="translate" values="0,0; -3,-16; 0,0" dur="5.5s" repeatCount="indefinite"/>
                </circle>
              </g>
            </g>

            <!-- 主角：漂流瓶 -->
            <g class="drift-bottle-main bottle-float" transform="scale(1.6) rotate(80)">
              <!-- 漂流瓶的复合漂流动画 -->
              <animateTransform attributeName="transform" type="translate"
                                values="0,0; 6,-4; 10,-2; 4,2; -3,4; -6,2; -2,-4; 3,-6; 0,0"
                                dur="10s" repeatCount="indefinite"/>
              <animateTransform attributeName="transform" type="rotate"
                                values="80; 85; 75; 88; 78; 83; 72; 82; 80"
                                dur="10s" repeatCount="indefinite" additive="sum"/>
              <animateTransform attributeName="transform" type="scale"
                                values="1.6; 1.65; 1.58; 1.62; 1.59; 1.64; 1.61; 1.63; 1.6"
                                dur="12s" repeatCount="indefinite" additive="sum"/>

              <!-- 平躺瓶子的水平阴影 -->
              <ellipse cx="0" cy="30" rx="70" ry="20" fill="#0891b2" opacity="0.22" transform="rotate(-80)">
                <animateTransform attributeName="transform" type="rotate"
                                  values="-80; -85; -75; -88; -78; -83; -72; -82; -80"
                                  dur="10s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.22;0.32;0.22;0.15;0.22" dur="10s" repeatCount="indefinite"/>
              </ellipse>

              <!-- 瓶子周围的海水变形效果 -->
              <g class="water-distortion" opacity="0.25">
                <!-- 瓶子前方的水推开效果 -->
                <path d="M-45,20 Q-35,15 -25,18 Q-15,22 -5,20 Q5,18 15,20 Q25,22 35,18 Q45,15 55,20"
                      stroke="#06b6d4" stroke-width="1.5" fill="none" opacity="0.4">
                  <animate attributeName="d" values="M-45,20 Q-35,15 -25,18 Q-15,22 -5,20 Q5,18 15,20 Q25,22 35,18 Q45,15 55,20;M-45,22 Q-33,17 -23,20 Q-13,24 -3,22 Q7,20 17,22 Q27,24 37,20 Q47,17 55,22;M-45,20 Q-35,15 -25,18 Q-15,22 -5,20 Q5,18 15,20 Q25,22 35,18 Q45,15 55,20" dur="4s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.4;0.2;0.4;0.6;0.4" dur="4s" repeatCount="indefinite"/>
                </path>

                <!-- 瓶子后方的水流回流 -->
                <path d="M-50,30 Q-40,35 -30,32 Q-20,28 -10,30 Q0,32 10,30 Q20,28 30,32 Q40,35 50,30"
                      stroke="#0891b2" stroke-width="1.2" fill="none" opacity="0.3">
                  <animate attributeName="d" values="M-50,30 Q-40,35 -30,32 Q-20,28 -10,30 Q0,32 10,30 Q20,28 30,32 Q40,35 50,30;M-50,32 Q-38,37 -28,34 Q-18,30 -8,32 Q2,34 12,32 Q22,30 32,34 Q42,37 50,32;M-50,30 Q-40,35 -30,32 Q-20,28 -10,30 Q0,32 10,30 Q20,28 30,32 Q40,35 50,30" dur="5s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.3;0.1;0.3;0.5;0.3" dur="5s" repeatCount="indefinite"/>
                </path>

                <!-- 瓶子侧面的水面凹陷 -->
                <ellipse cx="0" cy="25" rx="55" ry="8" fill="none" stroke="#22d3ee" stroke-width="0.8" opacity="0.25">
                  <animateTransform attributeName="transform" type="scale" values="1,1; 1.1,1.2; 1,1; 0.9,0.8; 1,1" dur="6s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.25;0.1;0.25;0.4;0.25" dur="6s" repeatCount="indefinite"/>
                </ellipse>

                <!-- 瓶子入水时的微小涟漪 -->
                <circle cx="0" cy="25" r="40" fill="none" stroke="#06b6d4" stroke-width="0.6" opacity="0.35">
                  <animate attributeName="r" values="40;65;40" dur="8s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.35;0.05;0.35" dur="8s" repeatCount="indefinite"/>
                </circle>
                <circle cx="0" cy="25" r="60" fill="none" stroke="#0891b2" stroke-width="0.4" opacity="0.25">
                  <animate attributeName="r" values="60;85;60" dur="10s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.25;0.02;0.25" dur="10s" repeatCount="indefinite"/>
                </circle>
              </g>

              <!-- 瓶子边缘的水膜效果 -->
              <g class="water-film" opacity="0.3">
                <path d="M-35,-5 Q-30,0 -25,3 Q-20,6 -15,8 Q-10,10 -5,11 Q0,12 5,11 Q10,10 15,8 Q20,6 25,3 Q30,0 35,-5"
                      stroke="#38bdf8" stroke-width="1" fill="none" opacity="0.4">
                  <animate attributeName="opacity" values="0.4;0.1;0.4;0.6;0.4" dur="3s" repeatCount="indefinite"/>
                  <animateTransform attributeName="transform" type="translate" values="0,0; 0,2; 0,0; 0,-1; 0,0" dur="3s" repeatCount="indefinite"/>
                </path>
              </g>

              <!-- 漂流瓶主体 - 多层真实玻璃效果 -->

              <!-- 清晰可见玻璃瓶轮廓 -->
              <path d="M-20,-115 Q-25,-122 -25,-130 L-25,-135 Q-25,-142 -20,-142 L20,-142 Q25,-142 25,-135 L25,-130 Q25,-122 20,-115
                       Q18,-108 16,-95 L14,-85 Q14,-70 22,-55 Q32,-40 36,-25 Q40,-10 40,8 Q40,20 32,28 Q22,35 0,35 Q-22,35 -32,28
                       Q-40,20 -40,8 Q-40,-10 -36,-25 Q-32,-40 -22,-55 Q-14,-70 -14,-85 L-16,-95 Q-18,-108 -20,-115 Z"
                    fill="none" stroke="url(#glassOuterEdge)" stroke-width="2.5"/>

              <!-- 透明玻璃瓶主体轻微填充 -->
              <path d="M-18,-113 Q-23,-120 -23,-128 L-23,-133 Q-23,-140 -18,-140 L18,-140 Q23,-140 23,-133 L23,-128 Q23,-120 18,-113
                       Q16,-106 14,-93 L12,-83 Q12,-68 20,-53 Q30,-38 34,-23 Q38,-8 38,10 Q38,18 30,26 Q20,33 0,33 Q-20,33 -30,26
                       Q-38,18 -38,10 Q-38,-8 -34,-23 Q-30,-38 -20,-53 Q-12,-68 -12,-83 L-14,-93 Q-16,-106 -18,-113 Z"
                    fill="url(#realGlassGradient)" stroke="none" opacity="0.6"/>

              <!-- 玻璃瓶内层轮廓线 -->
              <path d="M-16,-111 Q-21,-118 -21,-126 L-21,-131 Q-21,-138 -16,-138 L16,-138 Q21,-138 21,-131 L21,-126 Q21,-118 16,-111
                       Q14,-104 12,-91 L10,-81 Q10,-66 18,-51 Q28,-36 32,-21 Q36,-6 36,12 Q36,16 28,24 Q18,31 0,31 Q-18,31 -28,24
                       Q-36,16 -36,12 Q-36,-6 -32,-21 Q-28,-36 -18,-51 Q-10,-66 -10,-81 L-12,-91 Q-14,-104 -16,-111 Z"
                    fill="none" stroke="url(#glassInnerLayer)" stroke-width="1.2" opacity="0.5"/>

              <!-- 玻璃厚度轮廓强化 -->
              <path d="M-20,-115 Q-25,-122 -25,-130 L-25,-135 Q-25,-142 -20,-142 L20,-142"
                    fill="none" stroke="url(#glassThicknessShadow)" stroke-width="3" opacity="0.8"/>
              <path d="M-40,8 Q-40,20 -32,28 Q-22,35 0,35 Q22,35 32,28 Q40,20 40,8"
                    fill="none" stroke="url(#glassThicknessShadow)" stroke-width="2.5" opacity="0.7"/>

              <!-- 瓶内海水 -->
              <path d="M-35,0 Q-30,5 -20,8 Q0,12 20,8 Q30,5 35,0 Q35,8 30,15 Q20,22 0,22 Q-20,22 -30,15 Q-35,8 -35,0 Z"
                    fill="url(#seaWaterGradient)" opacity="0.4">
                <animate attributeName="d" values="M-35,0 Q-30,5 -20,8 Q0,12 20,8 Q30,5 35,0 Q35,8 30,15 Q20,22 0,22 Q-20,22 -30,15 Q-35,8 -35,0 Z;M-35,2 Q-28,7 -18,10 Q2,14 22,10 Q32,7 35,2 Q35,10 28,17 Q18,24 -2,24 Q-22,24 -32,17 Q-35,10 -35,2 Z;M-35,0 Q-30,5 -20,8 Q0,12 20,8 Q30,5 35,0 Q35,8 30,15 Q20,22 0,22 Q-20,22 -30,15 Q-35,8 -35,0 Z" dur="3s" repeatCount="indefinite"/>
              </path>

              <!-- 瓶内气泡效果 -->
              <g class="bottle-bubbles">
                <circle cx="-25" cy="-20" r="1.5" fill="url(#bubbleGradient)" opacity="0.7">
                  <animateTransform attributeName="transform" type="translate" values="0,0; 8,-5; 0,0" dur="6s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.7;0.3;0.7" dur="6s" repeatCount="indefinite"/>
                </circle>
                <circle cx="15" cy="-10" r="1" fill="url(#bubbleGradient)" opacity="0.6">
                  <animateTransform attributeName="transform" type="translate" values="0,0; -5,-8; 0,0" dur="5s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.6;0.2;0.6" dur="5s" repeatCount="indefinite"/>
                </circle>
                <circle cx="-10" cy="-35" r="0.8" fill="url(#bubbleGradient)" opacity="0.5">
                  <animateTransform attributeName="transform" type="translate" values="0,0; 3,-6; 0,0" dur="4s" repeatCount="indefinite"/>
                </circle>
              </g>

              <!-- 清晰可见瓶颈部分 - 玻璃厚度表现 -->
              <!-- 瓶颈外层轮廓 -->
              <rect x="-14" y="-155" width="28" height="15" rx="3" fill="none" stroke="url(#glassOuterEdge)" stroke-width="2.2"/>
              <!-- 瓶颈内层填充 -->
              <rect x="-12" y="-153" width="24" height="11" rx="2" fill="url(#glassInnerLayer)" stroke="none" opacity="0.4"/>
              <!-- 瓶颈厚度强化 -->
              <rect x="-14" y="-155" width="28" height="3" rx="2" fill="none" stroke="url(#glassThicknessShadow)" stroke-width="1.5" opacity="0.8"/>
              <!-- 瓶口圆润边缘轮廓 -->
              <ellipse cx="0" cy="-155" rx="14" ry="3" fill="none" stroke="url(#glassOuterEdge)" stroke-width="2"/>
              <ellipse cx="0" cy="-155" rx="12" ry="2" fill="url(#glassInnerLayer)" opacity="0.3"/>

              <!-- 传统软木塞配蜡封 -->
              <rect x="-18" y="-175" width="36" height="25" rx="3" fill="url(#corkCap)" filter="url(#softShadow)"/>
              <!-- 软木塞质感纹理 -->
              <line x1="-15" y1="-165" x2="15" y2="-165" stroke="#92400e" stroke-width="0.8" opacity="0.7"/>
              <line x1="-15" y1="-160" x2="15" y2="-160" stroke="#92400e" stroke-width="0.8" opacity="0.7"/>
              <line x1="-15" y1="-155" x2="15" y2="-155" stroke="#92400e" stroke-width="0.8" opacity="0.7"/>

              <!-- 红色蜡封 - 船锚印章 -->
              <ellipse cx="0" cy="-175" rx="22" ry="5" fill="#dc2626" opacity="0.9"/>
              <path d="M-4,-178 L4,-178 M0,-182 L0,-172 M-6,-175 L6,-175 M-3,-172 Q0,-174 3,-172"
                    stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" fill="none"/>

              <!-- 海洋主题绳索装饰 -->
              <path d="M-25,-175 Q-30,-170 -25,-165 Q-20,-160 -25,-155 Q-30,-150 -25,-145"
                    stroke="#0891b2" stroke-width="3" fill="none" opacity="0.8"/>
              <path d="M25,-175 Q30,-170 25,-165 Q20,-160 25,-155 Q30,-150 25,-145"
                    stroke="#0891b2" stroke-width="3" fill="none" opacity="0.8"/>

              <!-- 绳结装饰 -->
              <circle cx="-28" cy="-160" r="3" fill="#0e7490" opacity="0.9"/>
              <circle cx="28" cy="-160" r="3" fill="#0e7490" opacity="0.9"/>

              <!-- 增强的真实玻璃光线反射系统 -->
              <g class="glass-reflections">
                <!-- 主要边缘高光 - 左侧 -->
                <ellipse cx="-32" cy="-65" rx="3" ry="45" fill="#ffffff" opacity="0.85" transform="rotate(-8)" filter="url(#glassCaustics)">
                  <animate attributeName="opacity" values="0.85;0.5;0.85;0.95;0.85" dur="6s" repeatCount="indefinite"/>
                </ellipse>

                <!-- 玻璃内表面反射 -->
                <ellipse cx="-25" cy="-60" rx="4" ry="30" fill="url(#seaGlassHighlight)" opacity="0.6" transform="rotate(-3)">
                  <animate attributeName="opacity" values="0.6;0.3;0.6;0.8;0.6" dur="7s" repeatCount="indefinite"/>
                </ellipse>

                <!-- 瓶身曲面多层反射 -->
                <path d="M-35,-90 Q-30,-70 -28,-50 Q-26,-30 -24,-10 Q-22,10 -18,25"
                      stroke="#ffffff" stroke-width="1.5" fill="none" opacity="0.75">
                  <animate attributeName="opacity" values="0.75;0.4;0.75;0.9;0.75" dur="4s" repeatCount="indefinite"/>
                </path>

                <path d="M-32,-85 Q-27,-65 -25,-45 Q-23,-25 -21,-5 Q-19,15 -15,30"
                      stroke="url(#seaGlassHighlight)" stroke-width="1" fill="none" opacity="0.5">
                  <animate attributeName="opacity" values="0.5;0.2;0.5;0.7;0.5" dur="5s" repeatCount="indefinite"/>
                </path>

                <!-- 瓶口厚边缘高光 -->
                <ellipse cx="0" cy="-155" rx="14" ry="2" fill="#ffffff" opacity="0.9">
                  <animate attributeName="opacity" values="0.9;0.6;0.9;1;0.9" dur="3s" repeatCount="indefinite"/>
                </ellipse>

                <!-- 瓶底厚玻璃反射 -->
                <ellipse cx="0" cy="30" rx="25" ry="8" fill="url(#seaGlassHighlight)" opacity="0.6" transform="rotate(5)">
                  <animate attributeName="opacity" values="0.6;0.3;0.6;0.8;0.6" dur="6s" repeatCount="indefinite"/>
                </ellipse>

                <!-- 玻璃焦散光斑 -->
                <circle cx="-15" cy="-40" r="4" fill="#ffffff" opacity="0.6" filter="url(#glassCaustics)">
                  <animate attributeName="opacity" values="0.6;0.2;0.6;0.8;0.6" dur="4s" repeatCount="indefinite"/>
                  <animate attributeName="r" values="4;6;4;3;4" dur="4s" repeatCount="indefinite"/>
                </circle>

                <circle cx="20" cy="-20" r="3" fill="#ffffff" opacity="0.5" filter="url(#glassCaustics)">
                  <animate attributeName="opacity" values="0.5;0.1;0.5;0.7;0.5" dur="5s" repeatCount="indefinite"/>
                  <animate attributeName="r" values="3;5;3;2;3" dur="5s" repeatCount="indefinite"/>
                </circle>

                <!-- 色散效果在边缘 -->
                <path d="M-35,-100 Q-30,-80 -28,-60" stroke="url(#glassDispersion)" stroke-width="1" fill="none" opacity="0.4">
                  <animate attributeName="opacity" values="0.4;0.1;0.4;0.6;0.4" dur="6s" repeatCount="indefinite"/>
                </path>

                <path d="M35,-70 Q30,-50 28,-30" stroke="url(#glassDispersion)" stroke-width="0.8" fill="none" opacity="0.3">
                  <animate attributeName="opacity" values="0.3;0.05;0.3;0.5;0.3" dur="7s" repeatCount="indefinite"/>
                </path>
              </g>

              <!-- 清晰可见瓶底玻璃厚度和海水反射效果 -->
              <!-- 玻璃底部厚度轮廓 -->
              <ellipse cx="0" cy="33" rx="30" ry="12" fill="none" stroke="url(#glassThicknessShadow)" stroke-width="2" opacity="0.8"/>
              <ellipse cx="0" cy="31" rx="28" ry="10" fill="none" stroke="url(#glassOuterEdge)" stroke-width="1.5" opacity="0.9"/>
              <ellipse cx="0" cy="29" rx="25" ry="8" fill="url(#glassInnerLayer)" opacity="0.3"/>
              <!-- 海水反射在玻璃底部 -->
              <ellipse cx="0" cy="25" rx="35" ry="15" fill="url(#seaBottomReflection)" opacity="0.6"/>

              <!-- 瓶内海洋元素 - 平躺状态 -->
              <g class="bottle-interior">
                <!-- 玻璃内部容器遮罩 -->
                <defs>
                  <mask id="bottleInteriorMask">
                    <rect x="-38" y="-140" width="76" height="175" rx="35" fill="white"/>
                  </mask>
                </defs>

                <!-- 沉积到底部的海沙层 (平躺时在右下侧) - 带玻璃折射效果 -->
                <ellipse cx="25" cy="15" rx="8" ry="25" fill="url(#refractedSandGradient)"
                         transform="rotate(-10)" filter="url(#glassInteriorShadow)" mask="url(#bottleInteriorMask)">
                  <animate attributeName="opacity" values="0.8;0.9;0.8;0.7;0.8" dur="6s" repeatCount="indefinite"/>
                </ellipse>

                <!-- 沙粒沉积在底部 - 经过玻璃折射的效果 -->
                <g mask="url(#bottleInteriorMask)" filter="url(#glassRefraction)">
                  <circle cx="22" cy="5" r="1.5" fill="url(#refractedSandGradient)" opacity="0.9"/>
                  <circle cx="28" cy="12" r="1.2" fill="url(#refractedSandGradient)" opacity="0.8"/>
                  <circle cx="25" cy="20" r="0.8" fill="url(#refractedSandGradient)" opacity="1"/>
                  <circle cx="30" cy="8" r="1" fill="url(#refractedSandGradient)" opacity="0.7"/>
                  <circle cx="24" cy="25" r="1.1" fill="url(#refractedSandGradient)" opacity="0.8"/>

                  <!-- 额外细沙粒子 -->
                  <circle cx="26" cy="3" r="0.6" fill="#fbbf24" opacity="0.6"/>
                  <circle cx="31" cy="16" r="0.8" fill="#f59e0b" opacity="0.7"/>
                  <circle cx="23" cy="18" r="0.5" fill="#d97706" opacity="0.8"/>
                  <circle cx="29" cy="22" r="0.7" fill="#ea580c" opacity="0.6"/>
                </g>

                <!-- 贝壳沉在底部 - 带玻璃色彩影响 -->
                <g mask="url(#bottleInteriorMask)" filter="url(#glassInteriorShadow)">
                  <path d="M26,18 Q28,16 30,18 Q28,20 26,18" fill="#e6f7ff" stroke="#87ceeb" stroke-width="0.4" opacity="0.9"/>
                  <path d="M23,10 Q25,8 27,10 Q25,12 23,10" fill="#f0f8ff" stroke="#b0c4de" stroke-width="0.3" opacity="0.8"/>
                </g>


                <!-- 瓶内液体/空气分界线 - 带玻璃内部反射 -->
                <g mask="url(#bottleInteriorMask)">
                  <path d="M-35,-10 Q-20,-5 0,-8 Q20,-12 35,-8" stroke="#06b6d4" stroke-width="0.8" fill="none" opacity="0.4" filter="url(#glassInteriorShadow)">
                    <animate attributeName="d" values="M-35,-10 Q-20,-5 0,-8 Q20,-12 35,-8;M-35,-8 Q-20,-3 0,-6 Q20,-10 35,-6;M-35,-10 Q-20,-5 0,-8 Q20,-12 35,-8" dur="4s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.4;0.6;0.4;0.2;0.4" dur="4s" repeatCount="indefinite"/>
                  </path>

                  <!-- 玻璃内部光线折射痕迹 -->
                  <path d="M-30,5 Q-15,8 0,5 Q15,2 30,5" stroke="#e0f7fa" stroke-width="0.6" fill="none" opacity="0.3">
                    <animate attributeName="opacity" values="0.3;0.5;0.3;0.1;0.3" dur="5s" repeatCount="indefinite"/>
                  </path>

                  <!-- 沙子在玻璃中的微光反射 -->
                  <circle cx="25" cy="15" r="12" fill="none" stroke="#fde68a" stroke-width="0.5" opacity="0.2" transform="rotate(-10)">
                    <animate attributeName="opacity" values="0.2;0.4;0.2;0.1;0.2" dur="7s" repeatCount="indefinite"/>
                  </circle>
                </g>
              </g>

              <!-- 瓶外海水滴珠 -->
              <circle cx="-30" cy="-55" r="1.5" fill="#06b6d4" opacity="0.8"/>
              <circle cx="25" cy="-80" r="1.2" fill="#0891b2" opacity="0.7"/>
              <circle cx="-15" cy="5" r="1.8" fill="#06b6d4" opacity="0.9"/>
              <circle cx="32" cy="-25" r="1" fill="#0e7490" opacity="0.6"/>

              <!-- 瓶子边缘海洋光效 -->
              <path d="M-20,-115 Q-25,-122 -25,-130 L-25,-135 Q-25,-142 -20,-142"
                    fill="none" stroke="#ffffff" stroke-width="2" opacity="0.8"/>
              <path d="M20,-142 Q25,-142 25,-135 L25,-130 Q25,-122 20,-115"
                    fill="none" stroke="#a7f3d0" stroke-width="1.5" opacity="0.6"/>
            </g>

            <!-- 环绕瓶子的海洋气泡 -->
            <g class="surrounding-bubbles">
              <!-- 左侧气泡群 -->
              <circle cx="-120" cy="-80" r="4" fill="url(#bubbleGradient)" opacity="0.6" class="ocean-bubble">
                <animateTransform attributeName="transform" type="translate" values="0,0; 3,-20; 0,0" dur="5s" repeatCount="indefinite"/>
              </circle>
              <circle cx="-110" cy="-70" r="2.5" fill="url(#bubbleGradient)" opacity="0.7" class="ocean-bubble">
                <animateTransform attributeName="transform" type="translate" values="0,0; 2,-15; 0,0" dur="4s" repeatCount="indefinite"/>
              </circle>
              <circle cx="-125" cy="-65" r="3" fill="url(#bubbleGradient)" opacity="0.5" class="ocean-bubble">
                <animateTransform attributeName="transform" type="translate" values="0,0; 4,-22; 0,0" dur="6s" repeatCount="indefinite"/>
              </circle>

              <!-- 右侧气泡群 -->
              <circle cx="115" cy="-75" r="3.5" fill="url(#bubbleGradient)" opacity="0.6" class="ocean-bubble">
                <animateTransform attributeName="transform" type="translate" values="0,0; -2,-18; 0,0" dur="4.5s" repeatCount="indefinite"/>
              </circle>
              <circle cx="125" cy="-85" r="2" fill="url(#bubbleGradient)" opacity="0.8" class="ocean-bubble">
                <animateTransform attributeName="transform" type="translate" values="0,0; -3,-12; 0,0" dur="3.5s" repeatCount="indefinite"/>
              </circle>
              <circle cx="105" cy="-60" r="2.8" fill="url(#bubbleGradient)" opacity="0.4" class="ocean-bubble">
                <animateTransform attributeName="transform" type="translate" values="0,0; -1,-16; 0,0" dur="5.5s" repeatCount="indefinite"/>
              </circle>
            </g>

          </g>

          <!-- 装饰元素 -->
          <g class="decorations">
            <!-- 空气泡效果 -->
            <circle cx="150" cy="200" r="20" fill="#e0f2fe" opacity="0.2">
              <animate attributeName="r" values="20;25;20" dur="4s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.2;0.4;0.2" dur="4s" repeatCount="indefinite"/>
            </circle>
            <circle cx="100" cy="350" r="15" fill="#dbeafe" opacity="0.15">
              <animate attributeName="r" values="15;20;15" dur="3s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.15;0.3;0.15" dur="3s" repeatCount="indefinite"/>
            </circle>

            <!-- 右侧气泡 -->
            <circle cx="650" cy="180" r="18" fill="#bfdbfe" opacity="0.2">
              <animate attributeName="r" values="18;23;18" dur="5s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.2;0.35;0.2" dur="5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="700" cy="320" r="22" fill="#e0f2fe" opacity="0.15">
              <animate attributeName="r" values="22;27;22" dur="4s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.15;0.25;0.15" dur="4s" repeatCount="indefinite"/>
            </circle>

            <!-- 空的概念装饰 -->
            <g class="empty-concepts">
              <!-- 空心圆环 -->
              <circle cx="120" cy="180" r="12" fill="none" stroke="#93c5fd" stroke-width="2" opacity="0.4">
                <animate attributeName="r" values="12;15;12" dur="3s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.4;0.6;0.4" dur="3s" repeatCount="indefinite"/>
              </circle>
              <circle cx="680" cy="250" r="10" fill="none" stroke="#60a5fa" stroke-width="1.5" opacity="0.3">
                <animate attributeName="r" values="10;13;10" dur="4s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.3;0.5;0.3" dur="4s" repeatCount="indefinite"/>
              </circle>
            </g>
          </g>
        </svg>
      </div>

      <!-- 错误信息 -->
      <div class="error-info">
        <p class="error-description">
          抱歉，您访问的页面不存在或已被移除
        </p>

        <!-- 操作按钮 -->
        <div class="error-actions">
          <button class="modern-btn primary" @click="goHome">
            <span>返回首页</span>
          </button>
          <button class="modern-btn secondary" @click="goBack">
            <span>返回上页</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 方法
const goHome = () => {
  router.push('/dashboard')
}

const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push('/dashboard')
  }
}

// 设置页面标题
onMounted(() => {
  document.title = '页面不存在 - 图书管理系统'
})
</script>

<style lang="scss" scoped>
.error-container {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  overflow: hidden;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}


.error-content {
  position: relative;
  z-index: 2;
  text-align: center;
  color: #1e293b;
  max-width: 800px;
  width: 100%;
  animation: spaceFloat 1s ease-out;
  display: flex;
  flex-direction: column;
  align-items: center;
}

@keyframes spaceFloat {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-illustration {
  .not-found-svg {
    width: 90vw;
    height: 60vh;
    max-width: 900px;
    max-height: 700px;
    min-width: 700px;
    min-height: 500px;
  }
}

.error-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;

  .error-description {
    font-size: 18px;
    color: #475569;
    margin: 0 0 30px 0;
    line-height: 1.6;
    max-width: 450px;
    text-align: center;
  }
}

.error-actions {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

.modern-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  &.primary {
    background: #3b82f6;
    color: white;

    &:hover {
      background: #2563eb;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
  }

  &.secondary {
    background: #f8fafc;
    color: #475569;
    border: 1px solid #e2e8f0;

    &:hover {
      background: #f1f5f9;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  }

  .btn-icon {
    font-size: 16px;
  }

  &:active {
    transform: translateY(0);
  }
}


// 响应式设计
@media (max-width: 768px) {
  .error-content {
    padding: 20px;
  }

  .error-illustration .not-found-svg {
    width: 95vw;
    height: 60vh;
    min-width: 350px;
    min-height: 400px;
    max-width: 500px;
    max-height: 500px;
  }

  .error-description {
    font-size: 16px !important;
  }

  .error-actions {
    flex-direction: column;
    align-items: center;
    gap: 12px;

    .modern-btn {
      width: 100%;
      max-width: 200px;
    }
  }
}

@media (max-width: 480px) {
  .error-illustration .not-found-svg {
    width: 100vw;
    height: 50vh;
    min-width: 300px;
    min-height: 350px;
    max-width: 400px;
    max-height: 400px;
  }

  .error-description {
    font-size: 14px !important;
  }

  .modern-btn {
    padding: 10px 20px;
    font-size: 13px;
  }
}
</style>