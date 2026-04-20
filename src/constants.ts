import { SectorData } from './types';

export const SECTORS: SectorData[] = [
  {
    id: 'memory', name: '記憶體', tag: '輪漲中', tagClass: 'bg-red-500/20 text-red-400 border-red-500/40',
    strength: 82, pct: '+3.2%', pos: true, color: '#00e5ff',
    icon: '💾', bg: 'rgba(0, 229, 255, 0.08)',
    desc: '記憶體族群受 AI 需求帶動，HBM 供需緊俏，三星、SK 海力士持續漲價。',
    stocks: [
      { code: '4919', name: '新唐' }, { code: '3014', name: '聯詠' },
      { code: '5269', name: '祥碩' }, { code: '8183', name: '精英' },
      { code: '3006', name: '晶豪科' }
    ],
    spark: [28,32,30,35,40,38,45]
  },
  {
    id: 'abf', name: 'ABF載板', tag: '強勢整理', tagClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    strength: 71, pct: '+1.8%', pos: true, color: '#b388ff',
    icon: '🔌', bg: 'rgba(179, 136, 255, 0.06)',
    desc: 'ABF 載板供需逐漸回穩，AI 伺服器需求拉動高階載板，景氣持續復甦。',
    stocks: [
      { code: '3037', name: '欣興' }, { code: '2367', name: '燿華' },
      { code: '3376', name: '新日興' }, { code: '6669', name: '緯穎' }
    ],
    spark: [22,20,24,22,26,25,28]
  },
  {
    id: 'ai', name: 'AI伺服器', tag: '領漲族群', tagClass: 'bg-green-500/20 text-green-400 border-green-500/40',
    strength: 91, pct: '+5.1%', pos: true, color: '#00e676',
    icon: '🖥️', bg: 'rgba(0, 230, 118, 0.08)',
    desc: 'NVIDIA GB200 相關供應鏈強勢，AI 算力需求爆發，台廠代工比重大幅提升。',
    stocks: [
      { code: '2317', name: '鴻海' }, { code: '3231', name: '緯創' },
      { code: '6669', name: '緯穎' }, { code: '4938', name: '和碩' },
      { code: '2353', name: '宏碁' }
    ],
    spark: [35,38,40,45,50,48,56]
  },
  {
    id: 'cowos', name: 'CoWoS封裝', tag: '高檔盤整', tagClass: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    strength: 65, pct: '-0.5%', pos: false, color: '#ffd740',
    icon: '⚡', bg: 'rgba(255, 215, 64, 0.05)',
    desc: 'CoWoS 先進封裝產能大幅擴充後，短期獲利了結壓力出現，高檔震盪整理。',
    stocks: [
      { code: '2330', name: '台積電' }, { code: '3711', name: '日月光投控' },
      { code: '2454', name: '聯發科' }
    ],
    spark: [60,62,58,55,52,50,51]
  }
];
