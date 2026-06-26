import { useState, useEffect, useRef, useCallback } from "react";
import { C, S } from "../hooks/useTheme";

function Toast({msg,onClose}) {
  useEffect(()=>{ const t=setTimeout(onClose,3500); return()=>clearTimeout(t); },[onClose]);
  const good=/✅|🆙|🏆|🏴|🎁|\+\$/.test(msg);
  return(<div style={{position:"fixed",top:16,right:16,background:good?C.greenBg:C.redBg,border:`1px solid ${good?C.green:C.red}44`,borderRadius:6,padding:"12px 18px",color:good?C.green:"#ff6e6e",fontSize:12,zIndex:9999,maxWidth:320,lineHeight:1.5,boxShadow:"0 4px 20px #00000080"}}>{msg}</div>);
}

export default Toast;
