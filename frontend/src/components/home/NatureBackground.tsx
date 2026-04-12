export function NatureBackground() {
  return (
    <svg
      viewBox="0 0 1440 600"
      preserveAspectRatio="xMidYMax slice"
      className="pointer-events-none h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <style>{`
          @keyframes shimmer {
            0%, 100% { opacity: 0.08; }
            50% { opacity: 0.18; }
          }
          @keyframes smoke {
            0%, 100% { transform: translateY(0); opacity: 0.2; }
            50% { transform: translateY(-4px); opacity: 0.08; }
          }
          @keyframes drift {
            0% { transform: translateX(0); }
            100% { transform: translateX(50px); }
          }
          @keyframes birds {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(25px, -6px); }
          }
        `}</style>

        <radialGradient id="sg" cx="50%" cy="0%" r="45%">
          <stop offset="0%" stopColor="#fff9c4" stopOpacity="0.28" />
          <stop offset="50%" stopColor="#fff9c4" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#fff9c4" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b2dfdb" stopOpacity="0.25" />
          <stop offset="60%" stopColor="#80cbc4" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#e0f2f1" stopOpacity="0.03" />
        </linearGradient>

        <linearGradient id="mg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="30%" stopColor="#f5faf5" stopOpacity="0.4" />
          <stop offset="70%" stopColor="#f5faf5" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="lakeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#b2dfdb" stopOpacity="0.26" />
          <stop offset="55%" stopColor="#80cbc4" stopOpacity="0.13" />
          <stop offset="100%" stopColor="#4db6ac" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      <circle cx="720" cy="0" r="200" fill="url(#sg)" />

      <g opacity="0.05" style={{ animation: "drift 35s linear infinite" }}>
        <ellipse cx="220" cy="35" rx="55" ry="11" fill="#fff" />
        <ellipse cx="245" cy="30" rx="35" ry="8" fill="#fff" />
        <ellipse cx="200" cy="32" rx="25" ry="7" fill="#fff" />
      </g>
      <g opacity="0.04" style={{ animation: "drift 45s linear infinite", animationDelay: "-20s" }}>
        <ellipse cx="1080" cy="22" rx="48" ry="9" fill="#fff" />
        <ellipse cx="1100" cy="18" rx="30" ry="7" fill="#fff" />
      </g>
      <g opacity="0.035" style={{ animation: "drift 38s linear infinite", animationDelay: "-10s" }}>
        <ellipse cx="620" cy="15" rx="40" ry="8" fill="#fff" />
        <ellipse cx="640" cy="12" rx="26" ry="6" fill="#fff" />
      </g>

      <g
        opacity="0.06"
        stroke="#3a7d44"
        strokeWidth="1"
        fill="none"
        style={{ animation: "birds 9s ease-in-out infinite" }}
      >
        <path d="M310 50 Q314 42 318 50 Q322 42 326 50" />
        <path d="M335 40 Q338 33 341 40 Q344 33 347 40" />
        <path d="M322 57 Q325 51 328 57 Q331 51 334 57" />
      </g>
      <g
        opacity="0.045"
        stroke="#3a7d44"
        strokeWidth="0.9"
        fill="none"
        style={{ animation: "birds 11s ease-in-out infinite", animationDelay: "-4s" }}
      >
        <path d="M1080 55 Q1084 47 1088 55 Q1092 47 1096 55" />
        <path d="M1105 46 Q1108 39 1111 46 Q1114 39 1117 46" />
      </g>

      <path
        d="M0 240 L30 175 L58 190 L92 148 L125 170 L162 128 L198 152 L238 110 L275 138 L318 95 L358 122 L402 82 L442 108 L488 68 L530 92 L578 55 L620 78 L668 42 L700 32 L720 25 L740 30 L772 48 L820 72 L862 52 L908 80 L952 58 L998 88 L1042 65 L1088 92 L1132 72 L1178 98 L1218 78 L1262 105 L1302 88 L1348 115 L1388 98 L1440 110 L1440 240 Z"
        fill="#c8e6c9"
        opacity="0.18"
      />

      <g opacity="0.06" fill="#fff">
        <polygon points="488,68 506,86 470,86" />
        <polygon points="578,55 598,76 558,76" />
        <polygon points="668,42 690,65 646,65" />
        <polygon points="720,25 742,50 698,50" />
        <polygon points="862,52 882,74 842,74" />
      </g>

      <rect x="0" y="175" width="1440" height="50" fill="url(#mg)" opacity="0.22" />

      <path
        d="M0 310 L35 232 L72 255 L112 215 L155 240 L198 198 L242 225 L288 188 L332 215 L378 180 L422 208 L468 172 L512 198 L558 165 L602 190 L648 158 L692 148 L720 142 L748 148 L792 168 L838 155 L882 182 L928 162 L972 188 L1018 168 L1062 195 L1108 175 L1152 200 L1198 182 L1242 208 L1288 192 L1332 215 L1378 200 L1440 212 L1440 310 Z"
        fill="#a5d6a7"
        opacity="0.14"
      />

      <g opacity="0.04" fill="#fff">
        <polygon points="468,172 486,190 450,190" />
        <polygon points="558,165 578,185 538,185" />
        <polygon points="648,158 668,178 628,178" />
        <polygon points="720,142 742,165 698,165" />
        <polygon points="838,155 858,175 818,175" />
        <polygon points="928,162 948,182 908,182" />
      </g>

      <rect x="0" y="255" width="1440" height="40" fill="url(#mg)" opacity="0.15" />

      <path
        d="M0 370 L32 295 L68 318 L108 280 L152 305 L195 268 L240 292 L288 260 L335 285 L382 252 L428 278 L475 248 L520 272 L568 242 L615 265 L660 240 L700 232 L720 228 L740 232 L780 248 L825 265 L870 245 L918 272 L962 250 L1008 275 L1055 255 L1100 278 L1148 260 L1195 285 L1240 268 L1288 292 L1335 278 L1380 298 L1440 285 L1440 370 Z"
        fill="#81c784"
        opacity="0.11"
      />

      <g opacity="0.14">
        <g>
          <polygon points="105,355 125,282 145,355" fill="#2e7d32" />
          <polygon points="109,332 125,272 141,332" fill="#338a3a" />
          <polygon points="113,312 125,264 137,312" fill="#3d9842" />
          <polygon points="117,296 125,258 133,296" fill="#48a64c" />
          <rect x="123" y="355" width="4" height="14" fill="#5d4037" opacity="0.2" />
        </g>
        <g>
          <polygon points="163,360 185,290 207,360" fill="#2e7d32" />
          <polygon points="167,338 185,280 203,338" fill="#338a3a" />
          <polygon points="171,320 185,272 199,320" fill="#3d9842" />
          <polygon points="175,305 185,266 195,305" fill="#48a64c" />
          <rect x="183" y="360" width="4" height="14" fill="#5d4037" opacity="0.2" />
        </g>
        <g>
          <polygon points="52,372 70,315 88,372" fill="#338a3a" />
          <polygon points="56,355 70,308 84,355" fill="#3d9842" />
          <polygon points="60,340 70,302 80,340" fill="#48a64c" />
          <rect x="68" y="372" width="4" height="11" fill="#5d4037" opacity="0.2" />
        </g>
        <g>
          <polygon points="220,375 238,325 256,375" fill="#2e7d32" />
          <polygon points="224,358 238,318 252,358" fill="#338a3a" />
          <polygon points="228,344 238,312 248,344" fill="#3d9842" />
          <rect x="236" y="375" width="4" height="10" fill="#5d4037" opacity="0.2" />
        </g>
        <g>
          <polygon points="1274,358 1295,285 1316,358" fill="#2e7d32" />
          <polygon points="1278,335 1295,275 1312,335" fill="#338a3a" />
          <polygon points="1282,316 1295,268 1308,316" fill="#3d9842" />
          <polygon points="1286,300 1295,262 1304,300" fill="#48a64c" />
          <rect x="1293" y="358" width="4" height="14" fill="#5d4037" opacity="0.2" />
        </g>
        <g>
          <polygon points="1335,362 1355,296 1375,362" fill="#2e7d32" />
          <polygon points="1339,342 1355,286 1371,342" fill="#338a3a" />
          <polygon points="1343,324 1355,278 1367,324" fill="#3d9842" />
          <polygon points="1347,310 1355,272 1363,310" fill="#48a64c" />
          <rect x="1353" y="362" width="4" height="14" fill="#5d4037" opacity="0.2" />
        </g>
      </g>

      <g opacity="0.15" transform="translate(358, 370)">
        <rect x="0" y="10" width="28" height="18" fill="#6d4c41" rx="1" />
        <polygon points="-4,10 14,-5 32,10" fill="#5d4037" />
        <rect x="20" y="0" width="4" height="10" fill="#795548" />
        <circle cx="22" cy="-4" r="1.8" fill="#bdbdbd" opacity="0.2" style={{ animation: "smoke 7s ease-in-out infinite" }} />
        <circle
          cx="24"
          cy="-10"
          r="1.3"
          fill="#bdbdbd"
          opacity="0.1"
          style={{ animation: "smoke 7s ease-in-out infinite", animationDelay: "-2s" }}
        />
        <rect x="10" y="16" width="7" height="12" fill="#4e342e" rx="1" />
        <rect x="2" y="14" width="5.5" height="5" fill="#fff9c4" opacity="0.6" rx="0.5" />
        <rect x="20" y="14" width="5.5" height="5" fill="#fff9c4" opacity="0.6" rx="0.5" />
      </g>

      <path
        d="M372 398 Q375 408 380 418 Q388 432 400 440"
        stroke="#8d6e63"
        strokeWidth="0.8"
        fill="none"
        opacity="0.05"
        strokeDasharray="2 3"
        strokeLinecap="round"
      />

      <ellipse cx="720" cy="468" rx="300" ry="34" fill="url(#lg)" />
      <line x1="520" y1="462" x2="590" y2="462" stroke="#80cbc4" strokeWidth="0.6" style={{ animation: "shimmer 5s ease-in-out infinite" }} />
      <line
        x1="640"
        y1="470"
        x2="740"
        y2="470"
        stroke="#80cbc4"
        strokeWidth="0.45"
        style={{ animation: "shimmer 5s ease-in-out infinite", animationDelay: "1.2s" }}
      />
      <line
        x1="790"
        y1="465"
        x2="870"
        y2="465"
        stroke="#80cbc4"
        strokeWidth="0.55"
        style={{ animation: "shimmer 5s ease-in-out infinite", animationDelay: "2.4s" }}
      />

      <path
        d="M0 600 L0 510 Q160 488 320 505 Q480 518 640 498 Q800 485 880 495 Q1020 508 1160 492 Q1300 482 1440 500 L1440 600 Z"
        fill="#c8e6c9"
        opacity="0.08"
      />

      <g opacity="0.04" stroke="#388e3c" strokeWidth="0.7" fill="none" strokeLinecap="round">
        <path d="M440 505 Q442 496 444 490" />
        <path d="M444 505 Q446 498 449 492" />
        <path d="M920 495 Q922 486 925 480" />
        <path d="M924 495 Q927 488 930 482" />
      </g>

      <g opacity="0.07">
        <circle cx="470" cy="503" r="1.3" fill="#ef9a9a" />
        <circle cx="474" cy="500" r="0.9" fill="#f48fb1" />
        <circle cx="895" cy="493" r="1.3" fill="#fff59d" />
        <circle cx="899" cy="490" r="0.9" fill="#ffe082" />
      </g>

      <path d="M0 600 H1440" stroke="transparent" />
    </svg>
  );
}
