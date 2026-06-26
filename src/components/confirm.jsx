import { useState, useEffect, useRef, useCallback } from "react";
import { C, S } from "../hooks/useTheme";

function Confirm({msg,onYes,onNo}) {
  return(<div style={{position:"fixed",inset:0,background:"#000a",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10000}}>
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:28,maxWidth:320,textAlign:"center"}}>
      <div style={{marginBottom:20,lineHeight:1.6}}>{msg}</div>
      <div style={{display:"flex",gap:10,justifyContent:"center"}}>
        <button style={S.btn()} onClick={onYes}>CONFIRM</button>
        <button style={S.btn(C.muted,"#0d140d")} onClick={onNo}>CANCEL</button>
      </div>
    </div>
  </div>);
}

// ============================================================
// DAILY LOGIN MODAL
// ============================================================
export default Confirm;
