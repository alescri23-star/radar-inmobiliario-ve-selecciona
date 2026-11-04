const form=document.getElementById('professionalApplication');
const message=document.getElementById('applicationMessage');
const submit=document.getElementById('applicationSubmit');
const success=document.getElementById('applicationSuccess');

form.addEventListener('submit',async event=>{
  event.preventDefault();
  message.textContent='';
  submit.disabled=true;
  submit.textContent='Enviando…';
  try{
    const input=Object.fromEntries(new FormData(form));
    input.consent=input.consent==='on';
    const response=await fetch('/api/professional-applications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
    const result=await response.json();
    if(!response.ok)throw Error(result.error||'No se pudo enviar la solicitud');
    form.hidden=true;
    success.hidden=false;
    success.focus();
  }catch(error){
    message.textContent=error.message;
  }finally{
    submit.disabled=false;
    submit.textContent='Enviar solicitud';
  }
});
