import { useState, useEffect, useRef, useCallback } from "react";
import { C, S } from "../hooks/useTheme";

function Tabs({tabs,active,onSelect}) {
  return(<div style={{display:"flex",gap:6,marginBottom:14}}>
    {tabs.map(t=>(<button key={t} onClick={()=>onSelect(t)} style={{padding:"7px 18px",background:active===t?C.red:"#0d140d",border:`1px solid ${active===t?C.red:C.border}`,borderRadius:4,color:active===t?"#fff":C.muted,cursor:"pointer",fontSize:10,letterSpacing:2,textTransform:"uppercase"}}>{t}</button>))}
  </div>);
}

export default Tabs;
