const KEY="umanariShiftRetailV1"; // 小売店版専用の保存キー（飲食店版とは分離）
const BACKUP_KEY="umanariShiftRetailV1_autoBackups";
const MAX_AUTO_BACKUPS=30;
let state=load();let selectedShiftId=null;let editingCell=null;let toastTimer;let pendingCopySourceId=null;
const $=id=>document.getElementById(id);
const on=(id,event,handler)=>{const el=$(id);if(el)el[event]=handler;};
const els={shiftList:$("shiftList"),emptyMessage:$("emptyMessage"),detailPanel:$("detailPanel"),detailType:$("detailType"),detailTitle:$("detailTitle"),detailPeriod:$("detailPeriod"),staffEmptyMessage:$("staffEmptyMessage"),shiftTable:$("shiftTable"),staffList:$("staffList"),masterStaffEmptyMessage:$("masterStaffEmptyMessage"),shiftModal:$("shiftModal"),staffModal:$("staffModal"),assignmentModal:$("assignmentModal"),mobileModal:$("mobileModal"),shiftForm:$("shiftForm"),staffForm:$("staffForm"),shiftId:$("shiftId"),shiftName:$("shiftName"),shiftType:$("shiftType"),shiftGroupChecklist:$("shiftGroupChecklist"),startDate:$("startDate"),endDate:$("endDate"),shiftError:$("shiftError"),staffId:$("staffId"),staffName:$("staffName"),staffWorkTypes:$("staffWorkTypes"),isManager:$("isManager"),shiftStaffModal:$("shiftStaffModal"),shiftStaffChecklist:$("shiftStaffChecklist"),shiftStaffModalNote:$("shiftStaffModalNote"),quickStaffName:$("quickStaffName"),assignmentTitle:$("assignmentTitle"),assignmentSubtitle:$("assignmentSubtitle"),assignmentOptions:$("assignmentOptions"),customAssignmentInput:$("customAssignmentInput"),registeredAssignmentSettings:$("registeredAssignmentSettings"),registeredAssignmentList:$("registeredAssignmentList"),mobileQrImage:$("mobileQrImage"),mobileUrlInput:$("mobileUrlInput"),categoryList:$("categoryList"),newCategoryName:$("newCategoryName"),autoBackupList:$("autoBackupList"),autoBackupEmpty:$("autoBackupEmpty"),toast:$("toast")};
init();
function init(){migrateOld();bind();renderAll();save()}
function bind(){
 on("emptyCreateShiftButton","onclick",()=>startNewShift());on("openStaffModalButton","onclick",()=>openStaffModal());on("firstSetupStaffButton","onclick",()=>openStaffModal());on("firstSetupCreateShiftButton","onclick",()=>startNewShift());on("blankShiftButton","onclick",()=>{pendingCopySourceId=null;closeModal("shiftSource");openShiftModal()});on("closeDetailButton","onclick",closeDetail);on("pdfButton","onclick",exportPdf);on("mobileOpenButton","onclick",openMobileModal);on("lineShareButton","onclick",shareToLine);on("copyMobileUrlButton","onclick",copyMobileUrl);on("lineShareModalButton","onclick",shareToLine);on("manageShiftStaffButton","onclick",openShiftStaffModal);on("toggleHeadcountButton","onclick",toggleHeadcount);on("toggleDayStatusButton","onclick",toggleDayStatus);on("copyPreviousButton","onclick",copyPrevious);on("clearShiftButton","onclick",clearShift);on("addCategoryButton","onclick",addCategory);if(els.newCategoryName){els.newCategoryName.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addCategory()}})}on("addStaffGroupButton","onclick",addStaffModalGroup);if($("newStaffGroupName"))$("newStaffGroupName").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addStaffModalGroup()}});on("exportButton","onclick",exportBackup);if($("importInput"))$("importInput").onchange=importBackup;els.shiftForm.onsubmit=saveShift;els.staffForm.onsubmit=saveStaff;on("saveCustomAssignmentButton","onclick",saveCustomAssignment);on("registerCustomAssignmentButton","onclick",registerCustomAssignment);on("saveShiftStaffButton","onclick",saveShiftStaffSelection);on("quickAddStaffButton","onclick",quickAddStaff);els.customAssignmentInput.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();saveCustomAssignment()}};
 on("goToNewShiftButton","onclick",()=>{switchView("shifts");startNewShift()});
 on("staffModalCreateShiftButton","onclick",()=>{closeModal("staff");switchView("shifts");startNewShift()});
 on("createShiftButton","onclick",()=>startNewShift());
 on("openAnnouncementModalButton","onclick",()=>openAnnouncementModal());if($("announcementTemplate"))$("announcementTemplate").onchange=updateAnnouncementFieldsForTemplate;if($("announcementStartDate"))$("announcementStartDate").onchange=()=>renderAnnouncementDayStatusList(false);if($("announcementEndDate"))$("announcementEndDate").onchange=()=>renderAnnouncementDayStatusList(false);if($("announcementForm"))$("announcementForm").onsubmit=saveAnnouncement;on("addAnnouncementStatusButton","onclick",addAnnouncementStatus);if($("newAnnouncementStatusName"))$("newAnnouncementStatusName").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addAnnouncementStatus()}});
 on("addAnnouncementTemplateButton","onclick",addAnnouncementTemplate);if($("newAnnouncementTemplateName"))$("newAnnouncementTemplateName").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addAnnouncementTemplate()}});
 document.querySelectorAll("[data-close]").forEach(x=>x.onclick=()=>{
  const name=x.dataset.close;
  if(name==="staff"&&els.staffName.value.trim()&&!confirm("入力中の内容は保存されていません。閉じますか？"))return;
  closeModal(name);
 });
 document.querySelectorAll(".tab-button").forEach(x=>x.onclick=()=>switchView(x.dataset.view));document.querySelectorAll(".setting-link[data-info]").forEach(x=>x.onclick=()=>alert(x.dataset.info));on("openHelpModalButton","onclick",()=>openModal("help"));
}
function defaultState(){return {staff:[],shifts:[],categories:[{id:"early",name:"早番"},{id:"late",name:"遅番"},{id:"register",name:"レジ"},{id:"stocking",name:"品出し"}],customOptions:{early:[],late:[],register:[],stocking:[]},announcements:[],announcementStatuses:["営業","休業","臨時休業"],announcementTemplates:["臨時休業","夏季休暇","年末年始","営業時間変更","棚卸し"]}}
function load(){try{return JSON.parse(localStorage.getItem(KEY))||defaultState()}catch{return defaultState()}}
function save(){localStorage.setItem(KEY,JSON.stringify(state));autoBackup()}
function todayStr(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function loadAutoBackups(){try{const list=JSON.parse(localStorage.getItem(BACKUP_KEY));return Array.isArray(list)?list:[]}catch{return []}}
function autoBackup(){
 try{
  const list=loadAutoBackups();
  const today=todayStr();
  const snapshot={date:today,time:Date.now(),data:JSON.stringify(state)};
  const idx=list.findIndex(b=>b.date===today);
  if(idx>=0)list[idx]=snapshot;else list.unshift(snapshot);
  list.sort((a,b)=>b.time-a.time);
  if(list.length>MAX_AUTO_BACKUPS)list.length=MAX_AUTO_BACKUPS;
  localStorage.setItem(BACKUP_KEY,JSON.stringify(list));
 }catch(e){console.error("自動バックアップの保存に失敗しました",e)}
}
function renderAutoBackupList(){
 if(!els.autoBackupList)return;
 const list=loadAutoBackups();
 els.autoBackupEmpty.classList.toggle("hidden",list.length>0);
 els.autoBackupList.innerHTML="";
 list.forEach(b=>{
  const row=document.createElement("div");row.className="setting-item";
  const d=new Date(b.time);
  const timeLabel=`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  row.innerHTML=`<div><strong>${esc(fmt(b.date))}</strong><p>${esc(timeLabel)} 時点の内容</p></div><button type="button" class="secondary-button restore-auto-backup">この状態に戻す</button>`;
  row.querySelector(".restore-auto-backup").onclick=()=>restoreAutoBackup(b);
  els.autoBackupList.appendChild(row);
 });
}
function restoreAutoBackup(entry){
 if(!confirm(`${fmt(entry.date)}の自動バックアップに戻しますか？\n現在の内容は上書きされます。`))return;
 try{
  const x=JSON.parse(entry.data);
  if(!Array.isArray(x.staff)||!Array.isArray(x.shifts))throw 0;
  state=x;selectedShiftId=null;migrateOld();save();closeDetail();renderAll();toast(`${fmt(entry.date)}の内容に戻しました`);
 }catch{alert("復元に失敗しました。データが破損している可能性があります。")}
}
function id(){return crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random()}
function migrateOld(){
 if(!Array.isArray(state.staff))state.staff=[];if(!Array.isArray(state.shifts))state.shifts=[];if(!Array.isArray(state.announcements))state.announcements=[];
 if(!Array.isArray(state.announcementStatuses)||!state.announcementStatuses.length)state.announcementStatuses=["営業","休業","臨時休業"];
 if(!state.dayStatusUnified){state.announcementStatuses=["営業","休業","臨時休業"];state.dayStatusUnified=true;}
 if(!Array.isArray(state.announcementTemplates)||!state.announcementTemplates.length)state.announcementTemplates=["臨時休業","夏季休暇","年末年始","営業時間変更","棚卸し"];
 if(!Array.isArray(state.categories)||!state.categories.length)state.categories=[{id:"early",name:"早番"},{id:"late",name:"遅番"},{id:"register",name:"レジ"},{id:"stocking",name:"品出し"}];
 state.categories=state.categories.filter(c=>c&&c.id&&c.name);
 if(!state.customOptions||typeof state.customOptions!=="object")state.customOptions={};
 state.categories.forEach(c=>{if(!Array.isArray(state.customOptions[c.id]))state.customOptions[c.id]=[];state.customOptions[c.id]=[...new Set(state.customOptions[c.id].map(v=>String(v).trim()).filter(Boolean))]});
 if(!state.assignmentDefaultsSeeded){
  state.categories.forEach(c=>{
   const defaults={early:["休","○","11:00","10:00","9:00"],late:["休","○","17:00","14:00","13:00"]}[c.id]||["休","○"];
   defaults.forEach(v=>{if(!state.customOptions[c.id].includes(v))state.customOptions[c.id].unshift(v)});
  });
  state.assignmentDefaultsSeeded=true;
 }
 state.staff.forEach((p,i)=>{if(p.order==null)p.order=i;if(!Array.isArray(p.workTypes)){p.workTypes=p.workType==="both"?["lunch","dinner"]:[p.workType||"lunch"]}p.workTypes=p.workTypes.filter(t=>state.categories.some(c=>c.id===t));if(!p.workTypes.length)p.workTypes=[state.categories[0].id]});
 state.shifts.forEach(s=>{if(!state.categories.some(c=>c.id===s.type))s.type=state.categories[0].id;if(!s.staffOverrides||typeof s.staffOverrides!=="object")s.staffOverrides={include:[],exclude:[]};if(!Array.isArray(s.staffOverrides.include))s.staffOverrides.include=[];if(!Array.isArray(s.staffOverrides.exclude))s.staffOverrides.exclude=[];if(typeof s.showHeadcount!=="boolean")s.showHeadcount=false});sortStaff()
}
function switchView(name){["shifts","staff","settings","announcements","data","appSettings"].forEach(v=>$(v+"View").classList.toggle("hidden",v!==name));els.detailPanel.classList.toggle("hidden",!(name==="shifts"&&selectedShiftId));document.querySelectorAll(".tab-button").forEach(b=>b.classList.toggle("active",b.dataset.view===name))}
let savedScrollY=0;
function openModal(name){
 $(name+"Modal").classList.remove("hidden");
 if(!document.body.classList.contains("modal-open")){
  savedScrollY=window.scrollY;
  document.body.classList.add("modal-open");
  document.body.style.top=`-${savedScrollY}px`;
 }
}
function closeModal(name){
 $(name+"Modal").classList.add("hidden");
 if(!document.querySelector(".modal:not(.hidden)")){
  document.body.classList.remove("modal-open");
  document.body.style.top="";
  window.scrollTo(0,savedScrollY);
 }
}
function updateFirstSetupPanel(){
 const panel=$("firstSetupPanel");if(!panel)return;
 const titleEl=$("staffCountTitle");
 const guideEl=$("staffGuideMessage");
 const staffBtn=$("firstSetupStaffButton");
 const createBtn=$("firstSetupCreateShiftButton");
 if(titleEl)titleEl.textContent=`現在スタッフ登録 ${state.staff.length}人`;
 if(state.staff.length>0){
  if(guideEl)guideEl.innerHTML="続けて登録できます。<br>登録が終わったら、新しいシフトを作成しましょう。";
  if(staffBtn)staffBtn.textContent="＋ スタッフを追加登録する";
  if(createBtn)createBtn.classList.remove("hidden");
 }else{
  if(guideEl)guideEl.innerHTML="まずはスタッフを登録しましょう。<br>登録が終われば、すぐにシフトを作成できます。";
  if(staffBtn)staffBtn.textContent="＋ スタッフを登録する";
  if(createBtn)createBtn.classList.add("hidden");
 }
 panel.classList.toggle("hidden",state.shifts.length>0);
 panel.classList.toggle("panel-welcome",state.staff.length===0);
 els.emptyMessage.classList.add("hidden");
}
function renderAll(){renderTypeSelects();renderShiftList();renderStaffList();renderCategoryList();renderAutoBackupList();renderAnnouncementList();updateFirstSetupPanel();if(selectedShiftId)renderDetail()}
function startNewShift(){
 if(!state.shifts.length)return openShiftModal();
 pendingCopySourceId=null;
 renderShiftSourceList();
 openModal("shiftSource");
}
function renderShiftSourceList(){
 const list=$("shiftSourceList");if(!list)return;
 list.innerHTML=state.shifts.map(s=>`<div class="setting-item shift-source-item" data-id="${esc(s.id)}"><div><p class="type-badge">${esc(shiftGroupSummary(s))}</p><strong>${esc(s.name)}</strong><p>${fmt(s.startDate)} ～ ${fmt(s.endDate)}</p></div><button type="button" class="secondary-button">これをコピー</button></div>`).join("");
 list.querySelectorAll(".shift-source-item").forEach(row=>{
  row.querySelector("button").onclick=()=>{pendingCopySourceId=row.dataset.id;closeModal("shiftSource");openShiftModal()};
 });
}
function openShiftModal(shift=null){renderTypeSelects();renderShiftGroupChecklist(shift?shiftGroupIds(shift):[]);els.shiftForm.reset();els.shiftError.textContent="";$("shiftModalTitle").textContent=shift?"シフト表を編集":"新しいシフト表";els.shiftId.value=shift?.id||"";els.shiftName.value=shift?.name||"";if(shift){els.startDate.value=shift.startDate;els.endDate.value=shift.endDate}else suggestedDates();openModal("shift");els.shiftName.focus()}
function suggestedDates(){const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),last=new Date(y,d.getMonth()+1,0).getDate(),first=d.getDate()<=15;els.startDate.value=`${y}-${m}-${first?"01":"16"}`;els.endDate.value=`${y}-${m}-${first?"15":String(last).padStart(2,"0")}`}
function saveShift(e){
 e.preventDefault();
 const name=els.shiftName.value.trim(),start=els.startDate.value,end=els.endDate.value;
 const selectedGroups=[...els.shiftGroupChecklist.querySelectorAll('input:checked')].map(x=>x.value);
 if(!name){els.shiftError.textContent="シフト名を入力してください。";return}
 if(!start||!end){els.shiftError.textContent="開始日と終了日を選択してください。";return}
 if(end<start){els.shiftError.textContent="終了日は開始日以降にしてください。";return}
 if(dateRange(start,end).length>31){els.shiftError.textContent="1つのシフト表は31日以内にしてください。";return}
 if(!selectedGroups.length){els.shiftError.textContent="シフト用グループを1つ以上選択してください。";return}
 const existing=state.shifts.find(s=>s.id===els.shiftId.value);
 const type=selectedGroups[0];
 let created=null;
 if(existing){Object.assign(existing,{name,type,startDate:start,endDate:end,groups:selectedGroups});normalize(existing)}
 else{created={id:id(),name,type,startDate:start,endDate:end,assignments:{},staffOverrides:{include:[],exclude:[]},showHeadcount:false,lineSharedAt:null,dayStatuses:{},groups:selectedGroups};state.shifts.unshift(created);normalize(created)}
 save();closeModal("shift");renderAll();
 if(created){
   const source=pendingCopySourceId?state.shifts.find(s=>s.id===pendingCopySourceId):null;
   pendingCopySourceId=null;
   if(source){copyShiftInto(source,created);save();renderAll();toast("前回シフトをコピーしました")}
   else toast("新しいシフトを作成しました");
   openDetail(created.id);
 }else toast("シフト表を更新しました");
}
function copyShiftInto(source,target){
 const sourceDates=dateRange(source.startDate,source.endDate),targetDates=dateRange(target.startDate,target.endDate);
 const weekday=d=>new Date(d+"T00:00:00").getDay();
 const sourceByWeekday={};
 sourceDates.forEach(d=>{const w=weekday(d);(sourceByWeekday[w]=sourceByWeekday[w]||[]).push(d)});
 const usedCount={};
 const dateMap={};
 targetDates.forEach(d=>{
   const w=weekday(d);
   const i=usedCount[w]||0;
   usedCount[w]=i+1;
   const sourceDate=sourceByWeekday[w]?.[i];
   if(sourceDate)dateMap[d]=sourceDate;
 });
 target.assignments={};
 Object.entries(source.assignments||{}).forEach(([staffId,values])=>{
   target.assignments[staffId]={};
   targetDates.forEach(date=>{const sourceDate=dateMap[date];const value=sourceDate?values?.[sourceDate]:"";if(value)target.assignments[staffId][date]=value});
   if(!Object.keys(target.assignments[staffId]).length)delete target.assignments[staffId];
 });
 target.staffOverrides=JSON.parse(JSON.stringify(source.staffOverrides||{include:[],exclude:[]}));
 target.dayStatuses={};
 targetDates.forEach(date=>{
   const sourceDate=dateMap[date];
   if(sourceDate&&source.dayStatuses?.[sourceDate])target.dayStatuses[date]=source.dayStatuses[sourceDate];
 });
 target.groups=Array.isArray(source.groups)&&source.groups.length?source.groups.slice():[source.type||state.categories[0].id];
 target.type=target.groups[0];
 target.copySnapshot=JSON.parse(JSON.stringify(target.assignments));
}
function renderShiftList(){
 els.shiftList.innerHTML="";
 els.emptyMessage.classList.toggle("hidden",state.shifts.length>0);
 $("shiftListHeaderRow")?.classList.toggle("hidden",state.shifts.length===0);
 state.shifts.forEach(s=>{
  const c=document.createElement("article");c.className="shift-card";c.tabIndex=0;
  const sent=s.lineSharedAt?'<p class="sent-label"><span>LINE</span>で送信済み</p>':'';
  c.innerHTML=`<div class="shift-card-main"><div><p class="type-badge">${esc(categoryName(s.type))}</p><h3>${esc(s.name)}</h3><p class="shift-period">${fmt(s.startDate)} ～ ${fmt(s.endDate)}</p>${sent}</div><span class="chevron">›</span></div><div class="card-actions"><button class="small-button edit">編集</button><button class="danger-outline-button del">削除</button></div>`;
  const open=()=>openDetail(s.id);c.querySelector(".shift-card-main").onclick=open;c.onkeydown=e=>{if(e.key==="Enter")open()};
  c.querySelector(".edit").onclick=e=>{e.stopPropagation();openShiftModal(s)};
  c.querySelector(".del").onclick=e=>{e.stopPropagation();if(confirm(`「${s.name}」を削除しますか？`)){state.shifts=state.shifts.filter(x=>x.id!==s.id);if(selectedShiftId===s.id)closeDetail();save();renderAll()}};
  els.shiftList.appendChild(c)
 })
}
function openDetail(i){selectedShiftId=i;renderDetail();els.detailPanel.classList.remove("hidden");$("shiftsView").classList.add("detail-open");window.scrollTo({top:0,behavior:"auto"})}
function closeDetail(){selectedShiftId=null;els.detailPanel.classList.add("hidden");$("shiftsView").classList.remove("detail-open")}
function selected(){return state.shifts.find(s=>s.id===selectedShiftId)}
function shiftGroupIds(shift){if(Array.isArray(shift?.groups)&&shift.groups.length)return shift.groups.filter(Boolean);if(shift?.type)return [shift.type];return []}
function shiftGroupSummary(shift){const groups=shiftGroupIds(shift);return groups.length?groups.map(id=>categoryName(id)).join(" / "):categoryName(shift?.type)}
function getShiftDayStatus(shift,date){if(!shift||!date)return "営業";return shift.dayStatuses?.[date]||"営業"}
function setShiftDayStatus(shift,date,status){if(!shift||!date)return;if(!shift.dayStatuses||typeof shift.dayStatuses!="object")shift.dayStatuses={};if(status&&status!="営業")shift.dayStatuses[date]=status;else delete shift.dayStatuses[date]}

function publicUrl(){return `${location.origin}${location.pathname}`}
function qrApiUrl(u){return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(u)}`}
function openMobileModal(){
 const url=publicUrl();
 if(els.mobileUrlInput)els.mobileUrlInput.value=url;
 if(els.mobileQrImage){els.mobileQrImage.src=qrApiUrl(url);els.mobileQrImage.alt=`シンプルシフト表を開くQRコード`;}
 openModal("mobile");
}

function buildShiftShareText(){
 const url=publicUrl();
 const s=selected();
 if(!s)return `シンプルシフト表｜小売店版\n${url}`;
 const staff=getShiftStaff(s);
 const dates=dateRange(s.startDate,s.endDate);
 const lines=[
  `【${s.name}】`,
  `${categoryName(s.type)}　${fmt(s.startDate)}～${fmt(s.endDate)}`
 ];
 const statusSummary=dates.map(d=>`${d.slice(5).replace(/-/g,"/")} ${getShiftDayStatus(s,d)}`).join(" / ");
 lines.push(`営業状況：${statusSummary}`);
 staff.forEach(p=>{
  const entries=dates.map(d=>s.assignments?.[p.id]?.[d]||"").filter(Boolean);
  if(entries.length)lines.push(`${p.name}：${entries.join("、")}`);
 });
 lines.push("",`シフト表を開く：${url}`);
 return lines.join("\n");
}
function safeFileName(name){
 return String(name||"シフト表").replace(/[\\/:*?"<>|]/g,"_").slice(0,50);
}
function canvasBlob(canvas,type="image/png",quality=0.95){
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("画像を作成できませんでした")),type,quality));
}
async function createShiftImageFile(){
 const s=selected();
 if(!s)throw new Error("シフト表を開いてください。");
 const staff=getShiftStaff(s);
 const dates=dateRange(s.startDate,s.endDate);
 const nameWidth=150,cellWidth=72,rowHeight=44,titleHeight=104,padding=24;
 const rowCount=staff.length+(s.showHeadcount?1:0);
 const width=Math.max(900,padding*2+nameWidth+cellWidth*dates.length);
 const height=titleHeight+rowHeight*(rowCount+1)+padding*2;
 const scale=Math.min(2,4096/width,4096/height);
 const canvas=document.createElement("canvas");
 canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
 const ctx=canvas.getContext("2d");ctx.scale(scale,scale);
 ctx.fillStyle="#fffdf8";ctx.fillRect(0,0,width,height);
 ctx.fillStyle="#5b3500";ctx.font="bold 28px sans-serif";ctx.fillText(s.name,padding,42);
 ctx.font="16px sans-serif";ctx.fillText(`${categoryName(s.type)}　${fmt(s.startDate)} ～ ${fmt(s.endDate)}`,padding,72);
 ctx.fillStyle="#8a4a00";ctx.font="13px sans-serif";ctx.fillText("シンプルシフト表｜小売店版",padding,94);
 const top=titleHeight,left=padding;
 function cell(x,y,w,h,fill,stroke="#d6c4aa"){
  ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.strokeRect(x,y,w,h);
 }
 cell(left,top,nameWidth,rowHeight,"#f3e3cc");
 ctx.fillStyle="#5b3500";ctx.font="bold 14px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("名前",left+nameWidth/2,top+rowHeight/2);
 dates.forEach((d,i)=>{
  const x=left+nameWidth+i*cellWidth;const holiday=isJapaneseHoliday(d);const dow=new Date(d+"T00:00:00").getDay();
  cell(x,top,cellWidth,rowHeight,holiday||dow===0?"#fde9e7":dow===6?"#eaf3ff":"#f8efe2");
  ctx.fillStyle=holiday||dow===0?"#cf332d":dow===6?"#2367a8":"#5b3500";
  ctx.font="bold 12px sans-serif";ctx.fillText(headerDate(d).replace("<br>"," ").replace(/[()]/g,""),x+cellWidth/2,top+rowHeight/2);
 });
 staff.forEach((p,r)=>{
  const y=top+rowHeight*(r+1);const fill=r%2===0?"#ffffff":"#eef6ff";
  cell(left,y,nameWidth,rowHeight,fill);ctx.fillStyle="#2f2418";ctx.font="bold 14px sans-serif";ctx.textAlign="left";ctx.fillText(p.name,left+10,y+rowHeight/2);
  dates.forEach((d,i)=>{
   const x=left+nameWidth+i*cellWidth;cell(x,y,cellWidth,rowHeight,fill);
   const val=s.assignments?.[p.id]?.[d]||"";ctx.textAlign="center";ctx.font="bold 13px sans-serif";ctx.fillStyle=val==="休"?"#d13a2f":"#2f5f1f";ctx.fillText(val,x+cellWidth/2,y+rowHeight/2);
  });
 });
 if(s.showHeadcount){
  const y=top+rowHeight*(staff.length+1);cell(left,y,nameWidth,rowHeight,"#fff4d9");ctx.fillStyle="#5b3500";ctx.textAlign="left";ctx.font="bold 13px sans-serif";ctx.fillText("出勤人数",left+10,y+rowHeight/2);
  dates.forEach((d,i)=>{
   const x=left+nameWidth+i*cellWidth;cell(x,y,cellWidth,rowHeight,"#fff4d9");
   const count=staff.filter(p=>{const v=s.assignments?.[p.id]?.[d]||"";return v&&v!=="休"}).length;
   ctx.textAlign="center";ctx.fillStyle="#5b3500";ctx.font="bold 14px sans-serif";ctx.fillText(String(count),x+cellWidth/2,y+rowHeight/2);
  });
 }
 const blob=await canvasBlob(canvas);
 return new File([blob],`${safeFileName(s.name)}.png`,{type:"image/png"});
}
async function shareToLine(){
 const s=selected();
 if(!s){alert("先に送るシフト表を開いてください。");return;}
 const text=`${s.name}\n${categoryName(s.type)}　${fmt(s.startDate)}～${fmt(s.endDate)}`;
 try{
  const file=await createShiftImageFile();
  if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
   await navigator.share({title:"シンプルシフト表｜小売店版",text,files:[file]});
   const current=selected();if(current){current.lineSharedAt=new Date().toISOString();save();renderShiftList()}
   toast("記入済みシフト表の画像を共有しました");
   return;
  }
  const a=document.createElement("a");a.href=URL.createObjectURL(file);a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  alert("この端末では画像を直接共有できないため、記入済みシフト表を画像保存しました。LINEを開いて、その画像を添付してください。");
 }catch(error){
  if(error&&error.name==="AbortError")return;
  console.error(error);
  alert(error?.message||"シフト表の共有に失敗しました。もう一度お試しください。");
 }
}


async function copyMobileUrl(){
 const url=publicUrl();
 try{
  if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(url);
  else{els.mobileUrlInput.focus();els.mobileUrlInput.select();document.execCommand("copy")}
  toast("URLをコピーしました");
 }catch{alert("URLのコピーに失敗しました。URLを手で選んでコピーしてください。");}
}

function preparePrintLayout(){
 const s=selected();if(!s)return;
 const dayCount=dateRange(s.startDate,s.endDate).length;
 const rowCount=getShiftStaff(s).length+(s.showHeadcount?1:0);
 document.documentElement.style.setProperty("--print-day-count",dayCount);
 document.documentElement.style.setProperty("--print-row-count",rowCount);
 document.body.classList.toggle("print-dense",dayCount>20||rowCount>15);
 document.body.classList.toggle("print-ultra",dayCount>27||rowCount>21);
}
function clearPrintLayout(){
 document.body.classList.remove("print-dense","print-ultra");
}
window.addEventListener("beforeprint",preparePrintLayout);
window.addEventListener("afterprint",clearPrintLayout);
function exportPdf(){
 if(!selectedShiftId)return alert("PDFにするシフト表を開いてください。");
 document.body.classList.remove("printing-announcement","announcement-print-dense","announcement-print-ultra");
 preparePrintLayout();
 window.print();
}
function renderDetail(){
 const s=selected();if(!s)return;
 const staff=getShiftStaff(s);
 els.detailType.textContent=`${shiftGroupSummary(s)}シフト`;
 els.detailTitle.textContent=s.name;
 els.detailPeriod.textContent=`${fmt(s.startDate)} ～ ${fmt(s.endDate)}`;
 $("toggleHeadcountButton").textContent=s.showHeadcount?"出勤人数を非表示":"出勤人数を表示";
 els.staffEmptyMessage.classList.toggle("hidden",staff.length>0);
 $("copyChangeNote")?.classList.toggle("hidden",!s.copySnapshot);
 const dates=dateRange(s.startDate,s.endDate);
 const showDayStatus=s.showDayStatus!==false;
 $("toggleDayStatusButton").textContent=showDayStatus?"営業状態を非表示":"営業状態を表示";
 let h='<thead><tr><th>名前</th>';
 dates.forEach(d=>{
  const w=new Date(d+"T00:00:00").getDay();
  const holiday=isJapaneseHoliday(d);
  const classes=[];
  if(holiday)classes.push("holiday");
  else if(w===0)classes.push("sunday");
  else if(w===6)classes.push("saturday");
  const status=getShiftDayStatus(s,d);
  const statusHtml=showDayStatus?`<div class="day-status-wrap"><select class="day-status-select" data-date="${d}">${["営業","休業","臨時休業"].map(option=>`<option value="${option}" ${option===status?"selected":""}>${option}</option>`).join("")}</select><span class="print-day-status">${esc(status)}</span></div>`:"";
  h+=`<th class="${classes.join(" ")}"><div class="date-header-cell"><div class="date-label">${headerDate(d)}</div>${statusHtml}</div></th>`;
 });
 h+="</tr></thead><tbody>";
 staff.forEach((p,rowIndex)=>{
  const rowClass=rowIndex%2===0?"row-white":"row-blue";
  h+=`<tr class="${rowClass}"><td>${esc(p.name)}</td>`;
  dates.forEach(d=>{
   const v=s.assignments?.[p.id]?.[d]||"";
   const btnClasses=["shift-cell"];
   if(v==="休")btnClasses.push("value-off");
   else if(v==="○")btnClasses.push("value-lunch");
   else if(v)btnClasses.push("value-time");
   if(s.copySnapshot&&(s.copySnapshot?.[p.id]?.[d]||"")!==v)btnClasses.push("cell-changed");
   h+=`<td><button class="${btnClasses.join(" ")}" data-staff="${p.id}" data-date="${d}">${esc(v)}</button></td>`;
  });
  h+="</tr>";
 });
 if(s.showHeadcount){
  h+='<tr class="headcount-row"><td>出勤人数</td>';
  dates.forEach(d=>{
   const count=staff.filter(p=>isWorkingAssignment(s.assignments?.[p.id]?.[d]||"")).length;
   h+=`<td><strong>${count}人</strong></td>`;
  });
  h+="</tr>";
 }
 els.shiftTable.innerHTML=h+"</tbody>";
 els.shiftTable.querySelectorAll(".shift-cell").forEach(b=>b.onclick=()=>openAssignment(b.dataset.staff,b.dataset.date));
 els.shiftTable.querySelectorAll(".day-status-select").forEach(select=>{
  select.onchange=()=>{
   const status=select.value;
   const current=selected();
   if(!current)return;
   setShiftDayStatus(current,select.dataset.date,status);
   save();
   renderDetail();
  };
 });
}
function isWorkingAssignment(value){const v=String(value||"").trim();if(!v)return false;if(v==="休"||v==="休み"||v.includes("定休日")||v.includes("休業"))return false;return true}
function toggleHeadcount(){const s=selected();if(!s)return;s.showHeadcount=!s.showHeadcount;save();renderDetail()}
function toggleDayStatus(){const s=selected();if(!s)return;s.showDayStatus=s.showDayStatus===false;save();renderDetail()}
function openAssignment(staffId,date){const s=selected(),p=state.staff.find(x=>x.id===staffId);if(!s||!p)return;editingCell={staffId,date};els.assignmentTitle.textContent=p.name;els.assignmentSubtitle.textContent=longDate(date);renderAssignmentChoices();openModal("assignment");els.customAssignmentInput.focus()}
function baseChoices(type){return [["","未入力"]]}
function seedAssignmentDefaults(catId){if(!Array.isArray(state.customOptions[catId]))state.customOptions[catId]=[];["休","○"].forEach(v=>{if(!state.customOptions[catId].includes(v))state.customOptions[catId].unshift(v)})}
function renderAssignmentChoices(){const s=selected();if(!s||!editingCell)return;els.assignmentOptions.innerHTML="";const current=s.assignments?.[editingCell.staffId]?.[editingCell.date]||"",standard=baseChoices(s.type),registered=state.customOptions[s.type]||[],standardValues=new Set(standard.map(([v])=>v));const choices=[...standard,...registered.filter(v=>!standardValues.has(v)).map(v=>[v,v])];choices.forEach(([v,l])=>{const b=document.createElement("button");b.type="button";b.className="assignment-option"+(v===current?" selected":"");b.textContent=l;b.onclick=()=>setAssignment(v);els.assignmentOptions.appendChild(b)});els.customAssignmentInput.value=choices.some(([v])=>v===current)?"":current;renderRegisteredSettings(s.type)}
function renderRegisteredSettings(type){const items=state.customOptions[type]||[];els.registeredAssignmentSettings.classList.toggle("hidden",items.length===0);els.registeredAssignmentList.innerHTML="";items.forEach((value,index)=>{const row=document.createElement("div");row.className="registered-assignment-row";row.innerHTML=`<span>${esc(value)}</span><div><button type="button" class="mini-option-button up" ${index===0?"disabled":""}>↑</button><button type="button" class="mini-option-button down" ${index===items.length-1?"disabled":""}>↓</button><button type="button" class="mini-option-button delete">削除</button></div>`;row.querySelector(".up").onclick=()=>moveCustomOption(type,index,-1);row.querySelector(".down").onclick=()=>moveCustomOption(type,index,1);row.querySelector(".delete").onclick=()=>deleteCustomOption(type,value);els.registeredAssignmentList.appendChild(row)})}
function setAssignment(v){const s=selected(),{staffId,date}=editingCell;if(!s.assignments[staffId])s.assignments[staffId]={};if(v)s.assignments[staffId][date]=v;else delete s.assignments[staffId][date];if(Object.keys(s.assignments[staffId]).length===0)delete s.assignments[staffId];save();closeModal("assignment");renderDetail()}
function saveCustomAssignment(){const v=els.customAssignmentInput.value.trim();if(!v)return alert("自由入力の内容を入力してください。");setAssignment(v)}
function registerCustomAssignment(){const s=selected(),v=els.customAssignmentInput.value.trim();if(!s||!v)return alert("登録する内容を入力してください。");const standard=new Set(baseChoices(s.type).map(([value])=>value));if(standard.has(v))return alert("この内容はすでに標準の選択肢にあります。");const list=state.customOptions[s.type];if(list.includes(v))return alert("この内容はすでに登録されています。");list.push(v);save();renderAssignmentChoices();els.customAssignmentInput.value=v;toast(`「${v}」を登録しました`)}
function moveCustomOption(type,index,direction){const list=state.customOptions[type],next=index+direction;if(next<0||next>=list.length)return;[list[index],list[next]]=[list[next],list[index]];save();renderAssignmentChoices()}
function deleteCustomOption(type,value){if(!confirm(`登録した「${value}」を削除しますか？\nシフト表に入力済みの内容は消えません。`))return;state.customOptions[type]=state.customOptions[type].filter(v=>v!==value);save();renderAssignmentChoices();toast("登録内容を削除しました")}

function staffMatchesShift(p,shift){const groups=shiftGroupIds(shift);return Array.isArray(p.workTypes)&&groups.some(group=>p.workTypes.includes(group))}
function getShiftStaff(s){
 const include=new Set(s.staffOverrides?.include||[]),exclude=new Set(s.staffOverrides?.exclude||[]);
 const groups=shiftGroupIds(s);
 return [...state.staff].filter(p=>(groups.length?staffMatchesShift(p,s):false||include.has(p.id))&&!exclude.has(p.id)).sort((a,b)=>(b.isManager-a.isManager)||(a.order-b.order));
}
function openShiftStaffModal(){
 const s=selected();if(!s)return;
 if(!s.staffOverrides)s.staffOverrides={include:[],exclude:[]};
 els.shiftStaffModalNote.textContent=`${shiftGroupSummary(s)}登録のスタッフは最初から選択されています。`;
 renderShiftStaffChecklist(true);
 els.quickStaffName.value="";openModal("shiftStaff");
}
function renderShiftStaffChecklist(useDefaults){
 const s=selected();if(!s)return;
 const previousChecked=new Set([...els.shiftStaffChecklist.querySelectorAll('input[type="checkbox"]:checked')].map(x=>x.value));
 els.shiftStaffChecklist.innerHTML="";
 if(state.staff.length===0){els.shiftStaffChecklist.innerHTML='<div class="empty-message">スタッフが登録されていません。</div>';return}
 const ordered=[...state.staff].sort((a,b)=>(b.isManager-a.isManager)||(a.order-b.order));
 ordered.forEach((p,idx)=>{
  const checked=useDefaults?getShiftStaff(s).some(x=>x.id===p.id):previousChecked.has(p.id);
  const outOfGroup=!staffMatchesShift(p,s);
  const row=document.createElement("div");
  row.className="shift-staff-check-row"+(outOfGroup?" out-of-group":"");
  row.innerHTML=`<label><input type="checkbox" value="${p.id}" ${checked?"checked":""}><span><strong>${esc(p.name)}</strong><small>${esc(workTypeLabel(p))}${outOfGroup?'<span class="out-of-group-badge">グループ外</span>':""}</small></span></label><div class="staff-actions"><button type="button" class="small-button up" ${idx===0?"disabled":""}>↑</button><button type="button" class="small-button down" ${idx===ordered.length-1?"disabled":""}>↓</button></div>`;
  row.querySelector(".up").onclick=()=>{moveStaff(state.staff.findIndex(x=>x.id===p.id),-1);renderShiftStaffChecklist(false)};
  row.querySelector(".down").onclick=()=>{moveStaff(state.staff.findIndex(x=>x.id===p.id),1);renderShiftStaffChecklist(false)};
  els.shiftStaffChecklist.appendChild(row);
 });
}
function saveShiftStaffSelection(){
 const s=selected();if(!s)return;
 const checked=new Set([...els.shiftStaffChecklist.querySelectorAll('input[type="checkbox"]:checked')].map(x=>x.value));
 s.staffOverrides={include:[],exclude:[]};
 state.staff.forEach(p=>{
  const natural=staffMatchesShift(p,s),isChecked=checked.has(p.id);
  if(isChecked&&!natural)s.staffOverrides.include.push(p.id);
  if(!isChecked&&natural)s.staffOverrides.exclude.push(p.id);
 });
 save();closeModal("shiftStaff");renderDetail();toast("このシフトのスタッフを反映しました");
}
function quickAddStaff(){
 const s=selected(),name=els.quickStaffName.value.trim();if(!s||!name)return alert("スタッフ名を入力してください。");
 const duplicate=state.staff.find(p=>p.name===name);
 if(duplicate)return alert("同じ名前のスタッフがすでに登録されています。");
 const p={id:id(),name,workTypes:[s.type],isManager:false,order:state.staff.length};state.staff.push(p);sortStaff();save();renderStaffList();openShiftStaffModal();toast(`${name}を追加しました`);
}
function copyPrevious(){
 const s=selected();if(!s)return;
 const dates=dateRange(s.startDate,s.endDate);
 if(dates.length<2)return alert("コピーできる日がありません。");
 const isFilled=d=>state.staff.some(p=>s.assignments?.[p.id]?.[d]);
 let lastFilled=-1;
 for(let i=dates.length-1;i>=0;i--){if(isFilled(dates[i])){lastFilled=i;break}}
 if(lastFilled===-1)return alert("コピーできる入力済みのデータがありません。");
 if(lastFilled>=dates.length-1)return alert("コピーできる次の日がありません。");
 const prev=dates[lastFilled];
 const target=dates[lastFilled+1];
 const hasExisting=state.staff.some(p=>s.assignments?.[p.id]?.[target]);
 if(hasExisting&&!confirm(`${fmt(target)}にはすでに入力されています。前日（${fmt(prev)}）の内容で上書きしますか？`))return;
 state.staff.forEach(p=>{
  const v=s.assignments?.[p.id]?.[prev];
  if(!v)return;
  if(!s.assignments[p.id])s.assignments[p.id]={};
  s.assignments[p.id][target]=v;
 });
 save();renderDetail();toast("前日の内容をコピーしました");
}
function clearShift(){const s=selected();if(s&&confirm("このシフト表の入力内容をすべて消去しますか？")){s.assignments={};save();renderDetail();toast("入力を全消去しました")}}

const ANNOUNCEMENT_DEFAULT_STATUS={"臨時休業":"臨時休業","夏季休暇":"休業","年末年始":"休業","棚卸し":"臨時休業"};
function announcementStatusTextColor(name){return (name==="休業"||name==="臨時休業")?"#c62828":"#292421"}
function announcementPeriodText(start,end){if(!start)return "";if(!end||end===start)return longDate(start);return `${longDate(start)}～${longDate(end)}`}
function isConsecutiveDate(prev,next){return new Date(next+"T00:00:00")-new Date(prev+"T00:00:00")===86400000}
function announcementDayEntries(a){if(a.template==="営業時間変更")return [];return dateRange(a.startDate,a.endDate).map(d=>({date:d,status:a.dayStatuses?.[d]||"営業"}))}
function buildAnnouncementText(a){
 if(a.template==="営業時間変更"){
  const period=announcementPeriodText(a.startDate,a.endDate);
  return `${period}の営業時間を ${a.startTime}～${a.endTime} に変更させていただきます。`;
 }
 const groups=[];
 announcementDayEntries(a).forEach(({date:d,status})=>{
  const last=groups[groups.length-1];
  if(last&&last.status===status&&isConsecutiveDate(last.end,d))last.end=d;
  else groups.push({status,start:d,end:d});
 });
 const sentences=groups.map(g=>`${announcementPeriodText(g.start,g.end)}は${g.status}です。`);
 return sentences.join("\n");
}
function openAnnouncementModal(existing){
 renderAnnouncementTemplateSelect(true);
 $("announcementForm").reset();
 $("announcementError").textContent="";
 $("announcementId").value=existing?existing.id:"";
 $("announcementModalTitle").textContent=existing?"お知らせを編集":"お知らせを作成";
 $("announcementSubmitButton").textContent=existing?"変更を保存":"作成する";
 if(existing&&state.announcementTemplates.includes(existing.template))$("announcementTemplate").value=existing.template;
 $("announcementStartDate").value=existing?existing.startDate:todayStr();
 $("announcementEndDate").value=existing?existing.endDate:"";
 const isTime=$("announcementTemplate").value==="営業時間変更";
 $("announcementTimeFields").classList.toggle("hidden",!isTime);
 $("announcementDayStatusWrap").classList.toggle("hidden",isTime);
 if(isTime){
  $("announcementStartTime").value=existing?(existing.startTime||""):"";
  $("announcementEndTime").value=existing?(existing.endTime||""):"";
 }else{
  renderAnnouncementDayStatusList(!existing,existing?existing.dayStatuses:null);
 }
 renderAnnouncementStatusManageList();
 renderAnnouncementTemplateManageList();
 openModal("announcement");
}
function renderAnnouncementTemplateSelect(resetToFirst){
 const select=$("announcementTemplate");if(!select)return;
 const current=select.value;
 select.innerHTML=state.announcementTemplates.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join("");
 if(!resetToFirst&&state.announcementTemplates.includes(current))select.value=current;
}
function addAnnouncementTemplate(){
 const input=$("newAnnouncementTemplateName");
 const name=input.value.trim();
 if(!name)return alert("お知らせのテンプレート名を入力してください。");
 if(state.announcementTemplates.includes(name))return alert("同じ名前のテンプレートがすでに登録されています。");
 state.announcementTemplates.push(name);
 input.value="";
 save();renderAnnouncementTemplateSelect();renderAnnouncementTemplateManageList();updateAnnouncementFieldsForTemplate();
 toast(`「${name}」を追加しました`);
}
function deleteAnnouncementTemplate(name){
 if(state.announcementTemplates.length<=1)return alert("お知らせのテンプレートは最低1つ必要です。");
 if(!confirm(`「${name}」を削除しますか？`))return;
 state.announcementTemplates=state.announcementTemplates.filter(t=>t!==name);
 save();renderAnnouncementTemplateSelect();renderAnnouncementTemplateManageList();updateAnnouncementFieldsForTemplate();
}
function renderAnnouncementTemplateManageList(){
 const list=$("announcementTemplateManageList");if(!list)return;
 list.innerHTML=state.announcementTemplates.map(t=>`<div class="registered-assignment-row"><span>${esc(t)}</span><button type="button" class="mini-option-button delete" data-name="${esc(t)}">削除</button></div>`).join("");
 list.querySelectorAll(".delete").forEach(b=>b.onclick=()=>deleteAnnouncementTemplate(b.dataset.name));
}
function updateAnnouncementFieldsForTemplate(){
 const isTime=$("announcementTemplate").value==="営業時間変更";
 $("announcementTimeFields").classList.toggle("hidden",!isTime);
 $("announcementDayStatusWrap").classList.toggle("hidden",isTime);
 if(!isTime)renderAnnouncementDayStatusList(true)
}
function renderAnnouncementDayStatusList(resetDefaults,seedStatuses){
 const table=$("announcementDayStatusTable");if(!table)return;
 const start=$("announcementStartDate").value,endInput=$("announcementEndDate").value;
 if(!start){table.innerHTML="";return}
 const end=(endInput&&endInput>=start)?endInput:start;
 const dates=dateRange(start,end).slice(0,31);
 const template=$("announcementTemplate").value;
 const defaultStatus=ANNOUNCEMENT_DEFAULT_STATUS[template]||state.announcementStatuses[0];
 const previous={};
 table.querySelectorAll("select[data-date]").forEach(s=>{previous[s.dataset.date]=s.value});
 let h="<thead><tr>"+dates.map(d=>`<th>${headerDate(d)}</th>`).join("")+"</tr></thead><tbody><tr>";
 h+=dates.map(d=>{
  if(seedStatuses&&seedStatuses[d]){const seeded=seedStatuses[d];return `<td><select data-date="${d}" class="announcement-day-select">${state.announcementStatuses.map(s=>`<option value="${esc(s)}" ${s===seeded?"selected":""}>${esc(s)}</option>`).join("")}</select></td>`}
  const current=resetDefaults?defaultStatus:(previous[d]||defaultStatus);
  return `<td><select data-date="${d}" class="announcement-day-select">${state.announcementStatuses.map(s=>`<option value="${esc(s)}" ${s===current?"selected":""}>${esc(s)}</option>`).join("")}</select></td>`;
 }).join("");
 h+="</tr></tbody>";
 table.innerHTML=h;
}
function addAnnouncementStatus(){
 const input=$("newAnnouncementStatusName");
 const name=input.value.trim();
 if(!name)return alert("状態の名前を入力してください。");
 if(state.announcementStatuses.includes(name))return alert("同じ名前の状態がすでに登録されています。");
 state.announcementStatuses.push(name);
 input.value="";
 save();renderAnnouncementStatusManageList();renderAnnouncementDayStatusList(false);
 toast(`「${name}」を追加しました`);
}
function deleteAnnouncementStatus(name){
 if(state.announcementStatuses.length<=1)return alert("状態は最低1つ必要です。");
 if(!confirm(`「${name}」を削除しますか？`))return;
 state.announcementStatuses=state.announcementStatuses.filter(s=>s!==name);
 save();renderAnnouncementStatusManageList();renderAnnouncementDayStatusList(false);
}
function renderAnnouncementStatusManageList(){
 const list=$("announcementStatusManageList");if(!list)return;
 list.innerHTML=state.announcementStatuses.map(s=>`<div class="registered-assignment-row"><span>${esc(s)}</span><button type="button" class="mini-option-button delete" data-name="${esc(s)}">削除</button></div>`).join("");
 list.querySelectorAll(".delete").forEach(b=>b.onclick=()=>deleteAnnouncementStatus(b.dataset.name));
}
function saveAnnouncement(e){
 e.preventDefault();
 const template=$("announcementTemplate").value;
 const startDate=$("announcementStartDate").value;
 const endDate=$("announcementEndDate").value||startDate;
 const err=$("announcementError");
 if(!startDate){err.textContent="開始日を選択してください。";return}
 if(endDate<startDate){err.textContent="終了日は開始日以降にしてください。";return}
 if(dateRange(startDate,endDate).length>31){err.textContent="お知らせの期間は31日以内にしてください。";return}
 let startTime="",endTime="",dayStatuses={};
 if(template==="営業時間変更"){
  startTime=$("announcementStartTime").value;endTime=$("announcementEndTime").value;
  if(!startTime||!endTime){err.textContent="変更後の営業時間を入力してください。";return}
 }else{
  $("announcementDayStatusTable").querySelectorAll("select[data-date]").forEach(s=>{dayStatuses[s.dataset.date]=s.value});
 }
 const editId=$("announcementId").value;
 const existing=editId?state.announcements.find(x=>x.id===editId):null;
 if(existing){
  Object.assign(existing,{template,startDate,endDate,startTime,endTime,dayStatuses});
  existing.text=buildAnnouncementText(existing);
  save();closeModal("announcement");renderAnnouncementList();toast("お知らせを変更しました");
 }else{
  const a={id:id(),template,startDate,endDate,startTime,endTime,dayStatuses,createdAt:new Date().toISOString()};
  a.text=buildAnnouncementText(a);
  state.announcements.unshift(a);
  save();closeModal("announcement");renderAnnouncementList();toast("お知らせを作成しました");
 }
}
function renderAnnouncementList(){
 const list=$("announcementList");if(!list)return;
 $("announcementEmptyMessage")?.classList.toggle("hidden",state.announcements.length>0);
 list.innerHTML=state.announcements.map(a=>`<div class="setting-item"><div><p class="type-badge">${esc(a.template)}</p><p>${esc(a.text)}</p></div><div class="staff-actions"><button type="button" class="secondary-button edit" data-id="${a.id}">編集</button><button type="button" class="secondary-button line-share" data-id="${a.id}">LINEで送る</button><button type="button" class="secondary-button pdf" data-id="${a.id}">PDF保存</button><button type="button" class="danger-outline-button del" data-id="${a.id}">削除</button></div></div>`).join("");
 list.querySelectorAll(".edit").forEach(b=>b.onclick=()=>{const a=state.announcements.find(x=>x.id===b.dataset.id);if(a)openAnnouncementModal(a)});
 list.querySelectorAll(".line-share").forEach(b=>b.onclick=()=>shareAnnouncementToLine(b.dataset.id));
 list.querySelectorAll(".pdf").forEach(b=>b.onclick=()=>exportAnnouncementPdf(b.dataset.id));
 list.querySelectorAll(".del").forEach(b=>b.onclick=()=>{if(confirm("このお知らせを削除しますか？")){state.announcements=state.announcements.filter(x=>x.id!==b.dataset.id);save();renderAnnouncementList()}});
}
async function createAnnouncementImageFile(a){
 const width=760,padding=40,titleHeight=64,dateColWidth=190;
 const entries=announcementDayEntries(a);
 const rowHeight=54;
 const bodyHeight=entries.length?entries.length*rowHeight:60;
 const messageHeight=40;
 const height=titleHeight+padding*2+bodyHeight+messageHeight;
 const scale=2;
 const canvas=document.createElement("canvas");
 canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
 const ctx=canvas.getContext("2d");ctx.scale(scale,scale);
 ctx.fillStyle="#fffdf8";ctx.fillRect(0,0,width,height);
 ctx.fillStyle="#292421";ctx.font="bold 32px sans-serif";ctx.textBaseline="alphabetic";
 ctx.fillText(`${a.template}のお知らせ`,padding,padding+34);
 let y=padding+titleHeight;
 if(a.template==="営業時間変更"){
  ctx.fillStyle="#5b3500";ctx.font="16px sans-serif";
  ctx.fillText(announcementPeriodText(a.startDate,a.endDate),padding,y);y+=32;
  ctx.fillStyle="#292421";ctx.font="bold 21px sans-serif";
  ctx.fillText(`営業時間　${a.startTime}～${a.endTime}`,padding,y);y+=30;
 }else{
  entries.forEach(e=>{
   ctx.fillStyle="#292421";ctx.font="17px sans-serif";
   ctx.fillText(longDate(e.date),padding,y+24);
   const badgeX=padding+dateColWidth,badgeW=width-padding*2-dateColWidth;
   ctx.fillStyle=announcementStatusTextColor(e.status);ctx.font="bold 18px sans-serif";ctx.textAlign="center";
   ctx.fillText(e.status,badgeX+badgeW/2,y+22);ctx.textAlign="left";
   y+=rowHeight;
  });
 }
 ctx.fillStyle="#5b3500";ctx.font="18px sans-serif";
 ctx.fillText("ご不便をおかけしますが、何卒よろしくお願いいたします。",padding,y+26);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
 return new File([blob],"announcement.png",{type:"image/png"});
}
async function shareAnnouncementToLine(annId){
 const a=state.announcements.find(x=>x.id===annId);if(!a)return;
 try{
  const file=await createAnnouncementImageFile(a);
  if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
   await navigator.share({title:"シンプルシフト表｜小売店版",text:a.text,files:[file]});
   toast("お知らせの画像を共有しました");
   return;
  }
  const link=document.createElement("a");link.href=URL.createObjectURL(file);link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  alert("この端末では画像を直接共有できないため、お知らせを画像保存しました。LINEを開いて、その画像を添付してください。");
 }catch(error){
  if(error&&error.name==="AbortError")return;
  alert("共有に失敗しました。もう一度お試しください。");
 }
}
function renderAnnouncementCardHtml(a){
 const title=`<h2>${esc(a.template)}のお知らせ</h2>`;
 if(a.template==="営業時間変更"){
  return `${title}<p class="announcement-period">${esc(announcementPeriodText(a.startDate,a.endDate))}</p><p class="announcement-message">営業時間を ${esc(a.startTime)}～${esc(a.endTime)} に変更させていただきます。</p>`;
 }
 const rows=announcementDayEntries(a).map(e=>{
  return `<div class="announcement-day-row"><span class="announcement-day-date">${esc(longDate(e.date))}</span><span class="announcement-day-badge" style="color:${announcementStatusTextColor(e.status)}">${esc(e.status)}</span></div>`;
 }).join("");
 return `${title}<div class="announcement-day-rows">${rows}</div><p class="announcement-message">ご不便をおかけしますが、何卒よろしくお願いいたします。</p>`;
}
function exportAnnouncementPdf(annId){
 const a=state.announcements.find(x=>x.id===annId);if(!a)return;
 $("announcementPrintArea").innerHTML=renderAnnouncementCardHtml(a);
 const rowCount=announcementDayEntries(a).length;
 document.body.classList.remove("print-dense","print-ultra","announcement-print-dense","announcement-print-ultra");
 if(rowCount>22)document.body.classList.add("announcement-print-ultra");
 else if(rowCount>12)document.body.classList.add("announcement-print-dense");
 document.body.classList.add("printing-announcement");
 window.print();
}
function normalize(s){const valid=new Set(dateRange(s.startDate,s.endDate));Object.values(s.assignments||{}).forEach(m=>Object.keys(m).forEach(d=>{if(!valid.has(d))delete m[d]}));if(!s.dayStatuses||typeof s.dayStatuses!="object")s.dayStatuses={};Object.keys(s.dayStatuses).forEach(d=>{if(!valid.has(d))delete s.dayStatuses[d]})}
function openStaffModal(p=null){els.staffForm.reset();$("staffModalTitle").textContent=p?"スタッフ編集":"スタッフ追加";els.staffId.value=p?.id||"";els.staffName.value=p?.name||"";renderStaffTypeChecklist(p?.workTypes||[state.categories[0].id]);els.isManager.checked=!!p?.isManager;renderStaffModalRegisteredList(!p);openModal("staff");els.staffName.focus()}
function renderStaffModalRegisteredList(show){
 const wrap=$("staffModalRegisteredWrap");if(!wrap)return;
 wrap.classList.toggle("hidden",!show||state.staff.length===0);
 $("staffModalToShiftGuide")?.classList.toggle("hidden",!show||state.staff.length===0);
 $("staffModalRegisteredCount").textContent=state.staff.length;
 $("staffModalRegisteredNames").innerHTML=state.staff.map(p=>`<span class="staff-modal-registered-chip">${esc(p.name)}</span>`).join("");
}
function saveStaff(e){
 e.preventDefault();
 const name=els.staffName.value.trim();
 if(!name)return;
 const workTypes=[...els.staffWorkTypes.querySelectorAll('input:checked')].map(x=>x.value);
 if(!workTypes.length)return alert("シフト用グループを1つ以上選んでください。");
 const p=state.staff.find(x=>x.id===els.staffId.value);
 const isEditing=!!p;
 if(p){p.name=name;p.workTypes=workTypes;p.isManager=els.isManager.checked}
 else state.staff.push({id:id(),name,workTypes,isManager:els.isManager.checked,order:state.staff.length});
 sortStaff();save();renderAll();
 if(isEditing){
  closeModal("staff");
  toast("スタッフを保存しました");
 }else{
  toast(`${name}さんを登録しました。続けて登録できます`);
  els.staffForm.reset();
  els.staffId.value="";
  $("staffModalTitle").textContent="スタッフ追加";
  renderStaffTypeChecklist([state.categories[0].id]);
  els.isManager.checked=false;
  renderStaffModalRegisteredList(true);
  els.staffName.focus();
 }
}
function sortStaff(){state.staff.sort((a,b)=>(b.isManager-a.isManager)||(a.order-b.order));state.staff.forEach((s,i)=>s.order=i)}
function renderStaffList(){els.staffList.innerHTML="";els.masterStaffEmptyMessage.classList.toggle("hidden",state.staff.length>0);state.staff.forEach((p,i)=>{const r=document.createElement("div");r.className="staff-row";r.innerHTML=`<div><span class="staff-name">${esc(p.name)}</span>${p.isManager?'<span class="manager-mark">店長</span>':''}</div><div class="staff-actions"><button class="small-button up" ${i===0?'disabled':''}>↑</button><button class="small-button down" ${i===state.staff.length-1?'disabled':''}>↓</button><button class="small-button edit">編集</button><button class="danger-button del">削除</button></div>`;r.querySelector(".edit").onclick=()=>openStaffModal(p);r.querySelector(".del").onclick=()=>deleteStaff(p);r.querySelector(".up").onclick=()=>moveStaff(i,-1);r.querySelector(".down").onclick=()=>moveStaff(i,1);els.staffList.appendChild(r)});$("staffToShiftGuide")?.classList.toggle("hidden",state.staff.length===0)}
function moveStaff(i,d){const j=i+d;if(j<0||j>=state.staff.length)return;[state.staff[i],state.staff[j]]=[state.staff[j],state.staff[i]];state.staff.forEach((s,k)=>{s.order=k;s.isManager=k===0&&s.isManager});save();renderAll()}
function deleteStaff(p){if(!confirm(`「${p.name}」を削除しますか？\n過去のシフト入力も削除されます。`))return;state.staff=state.staff.filter(x=>x.id!==p.id);state.shifts.forEach(s=>{delete s.assignments[p.id];if(s.staffOverrides){s.staffOverrides.include=s.staffOverrides.include.filter(x=>x!==p.id);s.staffOverrides.exclude=s.staffOverrides.exclude.filter(x=>x!==p.id)}});save();renderAll();toast("スタッフを削除しました")}
function exportBackup(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`シンプルシフト表_バックアップ_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)}
function importBackup(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!Array.isArray(x.staff)||!Array.isArray(x.shifts))throw 0;if(!confirm("現在のデータをバックアップ内容に置き換えますか？"))return;state=x;selectedShiftId=null;save();closeDetail();renderAll();toast("保存データから復元しました")}catch{alert("正しいバックアップファイルではありません。")};e.target.value=""};r.readAsText(f)}

function categoryName(type){return state.categories.find(c=>c.id===type)?.name||type}
function renderTypeSelects(){if(els.shiftType){const current=els.shiftType.value;els.shiftType.innerHTML=state.categories.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");if(state.categories.some(c=>c.id===current))els.shiftType.value=current}}
function renderShiftGroupChecklist(selectedGroups=[]){if(!els.shiftGroupChecklist)return;els.shiftGroupChecklist.innerHTML=state.categories.map(c=>`<label class="check-label"><input type="checkbox" value="${esc(c.id)}" ${selectedGroups.includes(c.id)?"checked":""}>${esc(c.name)}</label>`).join("")}
function renderStaffTypeChecklist(selectedTypes=[]){els.staffWorkTypes.innerHTML=state.categories.map(c=>`<label class="check-label"><input type="checkbox" value="${esc(c.id)}" ${selectedTypes.includes(c.id)?"checked":""}>${esc(c.name)}</label>`).join("")}
function workTypeLabel(p){return (p.workTypes||[]).map(categoryName).join("・")||"未設定"}
function slugifyCategory(name){const base=name.toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g,"-").replace(/^-+|-+$/g,"");return (base||"type")+"-"+Date.now().toString(36)}
function addCategory(){const name=els.newCategoryName.value.trim();if(!name)return alert("シフト用グループ名を入力してください。");if(state.categories.some(c=>c.name===name))return alert("同じシフト用グループ名が登録されています.");const category={id:slugifyCategory(name),name};state.categories.push(category);state.customOptions[category.id]=[];seedAssignmentDefaults(category.id);els.newCategoryName.value="";save();renderAll();toast(`「${name}」を追加しました`)}
function addStaffModalGroup(){
 const input=$("newStaffGroupName");
 const name=input.value.trim();
 if(!name)return alert("シフト用グループ名を入力してください。");
 if(state.categories.some(c=>c.name===name))return alert("同じシフト用グループ名が登録されています。");
 const current=[...els.staffWorkTypes.querySelectorAll("input:checked")].map(x=>x.value);
 const category={id:slugifyCategory(name),name};
 state.categories.push(category);
 state.customOptions[category.id]=[];
 seedAssignmentDefaults(category.id);
 input.value="";
 save();
 renderStaffTypeChecklist([...current,category.id]);
 renderCategoryList();
 toast(`「${name}」を追加しました`);
}
function renderCategoryList(){
 if(!els.categoryList)return;
 els.categoryList.innerHTML="";
 state.categories.forEach((c,i)=>{
  const row=document.createElement("div");
  row.className="staff-row category-edit-row";
  row.innerHTML=`<div class="category-name-edit"><span class="category-number">${i+1}</span><input class="category-name-input" type="text" maxlength="20" value="${esc(c.name)}" aria-label="シフト用グループ名"></div><div class="staff-actions"><button type="button" class="primary-button save-name">変更を保存</button><button type="button" class="danger-button del">削除</button></div>`;
  const input=row.querySelector(".category-name-input");
  const saveButton=row.querySelector(".save-name");
  const commit=()=>renameCategoryFromInput(c,input.value);
  saveButton.onclick=commit;
  input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();commit()}});
  row.querySelector(".del").onclick=()=>deleteCategory(c);
  els.categoryList.appendChild(row);
 });
}
function renameCategoryFromInput(c,value){
 const name=String(value||"").trim();
 if(!name)return alert("シフト用グループ名を入力してください。");
 if(name===c.name)return toast("変更はありません");
 if(state.categories.some(x=>x.id!==c.id&&x.name===name))return alert("同じシフト用グループ名が登録されています。");
 c.name=name;save();renderAll();toast("シフト用グループ名を変更しました");
}
function renameCategory(c){const name=prompt("新しいシフト用グループ名を入力してください。",c.name)?.trim();if(!name||name===c.name)return;renameCategoryFromInput(c,name)}
function deleteCategory(c){if(state.categories.length<=1)return alert("シフト用グループは最低1つ必要です.");const usedShift=state.shifts.some(s=>s.type===c.id),usedStaff=state.staff.some(p=>(p.workTypes||[]).includes(c.id));if(usedShift||usedStaff)return alert("このシフト用グループはシフト表またはスタッフで使用中です。先に別のシフト用グループへ変更してください.");if(!confirm(`「${c.name}」を削除しますか？`))return;state.categories=state.categories.filter(x=>x.id!==c.id);delete state.customOptions[c.id];save();renderAll();toast("シフト用グループを削除しました")}
function dateRange(a,b){const arr=[],d=new Date(a+"T00:00:00"),e=new Date(b+"T00:00:00");while(d<=e){arr.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);d.setDate(d.getDate()+1)}return arr}
function fmt(d){const x=new Date(d+"T00:00:00");return `${x.getFullYear()}年${x.getMonth()+1}月${x.getDate()}日`}
function headerDate(d){const x=new Date(d+"T00:00:00"),w="日月火水木金土"[x.getDay()];return `${x.getMonth()+1}/${x.getDate()}<br>(${w}${isJapaneseHoliday(d)?"・祝":""})`}
function longDate(d){const x=new Date(d+"T00:00:00"),w="日月火水木金土"[x.getDay()];return `${x.getMonth()+1}月${x.getDate()}日（${w}${isJapaneseHoliday(d)?"・祝":""}）`}

const holidayCache={};
function isJapaneseHoliday(dateStr){
 const year=Number(dateStr.slice(0,4));
 if(!holidayCache[year])holidayCache[year]=buildJapaneseHolidaySet(year);
 return holidayCache[year].has(dateStr);
}
function buildJapaneseHolidaySet(year){
 const set=new Set();
 const add=(m,d)=>set.add(formatYmd(year,m,d));
 add(1,1);
 add(1,nthMonday(year,1,2));
 add(2,11);
 if(year>=2020)add(2,23);
 add(3,vernalEquinoxDay(year));
 add(4,29);add(5,3);add(5,4);add(5,5);
 add(7,nthMonday(year,7,3));
 if(year>=2016)add(8,11);
 add(9,nthMonday(year,9,3));
 add(9,autumnEquinoxDay(year));
 add(10,nthMonday(year,10,2));
 add(11,3);add(11,23);
 const originalHolidays=[...set].sort();
 for(const day of originalHolidays){
  const dt=new Date(day+"T00:00:00");
  if(dt.getDay()!==0)continue;
  const sub=new Date(dt);
  do{sub.setDate(sub.getDate()+1)}while(set.has(toDateStr(sub)));
  set.add(toDateStr(sub));
 }
 const list=[...set].sort();
 for(let i=0;i<list.length-1;i++){
  const a=new Date(list[i]+"T00:00:00"),b=new Date(list[i+1]+"T00:00:00");
  const mid=new Date(a);mid.setDate(mid.getDate()+1);
  if(toDateStr(mid)===list[i+1])continue;
  if(mid<b && b-mid===86400000){
   const midStr=toDateStr(mid);
   if(mid.getDay()!==0 && !set.has(midStr))set.add(midStr);
  }
 }
 return set;
}
function formatYmd(y,m,d){return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`}
function toDateStr(dt){return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`}
function nthMonday(year,month,n){const first=new Date(year,month-1,1),offset=(8-first.getDay())%7;return 1+offset+7*(n-1)}
function vernalEquinoxDay(year){return Math.floor(20.8431+0.242194*(year-1980))-Math.floor((year-1980)/4)}
function autumnEquinoxDay(year){return Math.floor(23.2488+0.242194*(year-1980))-Math.floor((year-1980)/4)}
function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function toast(t){clearTimeout(toastTimer);els.toast.textContent=t;els.toast.classList.remove("hidden");toastTimer=setTimeout(()=>els.toast.classList.add("hidden"),1800)}
