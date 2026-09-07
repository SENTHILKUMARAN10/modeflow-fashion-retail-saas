// ModeFlow production authentication UX: Google OAuth, email verification, password recovery.
(function(){
  if(!window.tkCloud?.enabled) return;
  const cloud=window.tkCloud, qs=s=>document.querySelector(s);
  const toastMsg=m=>{ if(typeof toast==='function') toast(m); else alert(m); };
  const setStatus=m=>{const el=qs('#cloudStatus'); if(el) el.textContent=m;};
  const errorText=err=>window.ModeFlowCore?.friendlyError?.(err)||String(err?.message||err||'Authentication failed');
  const redirectUrl=()=>location.origin+location.pathname;
  const form=qs('#cloudLogin'); if(!form) return;
  function makeButton(id,text,cls='btn full'){let el=qs('#'+id);if(el)return el;el=document.createElement('button');el.type='button';el.id=id;el.className=cls;el.textContent=text;return el;}

  const google=makeButton('googleLogin','Continue with Google','btn full oauth-google');
  google.innerHTML='<span aria-hidden="true">G</span> Continue with Google';
  google.onclick=async()=>{google.disabled=true;setStatus('Opening Google sign-in…');try{const {error}=await cloud.auth.signInGoogle(redirectUrl());if(error)throw error;}catch(err){google.disabled=false;setStatus('Google sign-in failed.');toastMsg(errorText(err));}};
  form.parentNode.insertBefore(google,form);

  const create=qs('#demoLogin');
  if(create){create.textContent='Create account with email →';create.onclick=async()=>{const email=qs('#loginEmail')?.value.trim(),password=qs('#loginPassword')?.value||'';if(!email)return toastMsg('Enter your email address first');if(password.length<8)return toastMsg('Password must be at least 8 characters');create.disabled=true;setStatus('Creating your account…');try{const {data,error}=await cloud.auth.signUp(email,password,redirectUrl());if(error)throw error;if(data?.session){setStatus('Account created and signed in.');toastMsg('Account created');}else{setStatus('Check your email to verify your account.');toastMsg('Verification email sent');}}catch(err){setStatus('Account creation failed.');toastMsg(errorText(err));}finally{create.disabled=false;}};}

  let reset=qs('#resetPassword');if(!reset){reset=makeButton('resetPassword','Forgot password?','text-link');form.appendChild(reset);}reset.onclick=async()=>{const email=qs('#loginEmail')?.value.trim();if(!email)return toastMsg('Enter your email address first');reset.disabled=true;setStatus('Sending password reset email…');try{const {error}=await cloud.auth.resetPassword(email,redirectUrl());if(error)throw error;setStatus('Password reset email sent. Check inbox and spam.');toastMsg('Password reset email sent');}catch(err){setStatus('Could not send reset email.');toastMsg(errorText(err));}finally{reset.disabled=false;}};

  const resend=makeButton('resendVerification','Resend verification email','text-link');
  resend.onclick=async()=>{const email=qs('#loginEmail')?.value.trim();if(!email)return toastMsg('Enter your email address first');resend.disabled=true;setStatus('Sending verification email…');try{const {error}=await cloud.auth.resendVerification(email,redirectUrl());if(error)throw error;setStatus('Verification email sent. Check inbox and spam.');toastMsg('Verification email sent');}catch(err){setStatus('Could not resend verification email.');toastMsg(errorText(err));}finally{resend.disabled=false;}};form.appendChild(resend);

  function showRecoveryForm(){if(qs('#modeflowRecovery'))return;const wrap=document.createElement('div');wrap.id='modeflowRecovery';wrap.className='stack auth-recovery';wrap.innerHTML='<label>New password<input id="recoveryPassword" type="password" autocomplete="new-password" minlength="8" placeholder="Minimum 8 characters"></label><label>Confirm new password<input id="recoveryConfirm" type="password" autocomplete="new-password" minlength="8" placeholder="Repeat password"></label><button id="saveRecoveryPassword" type="button" class="btn primary full">Update password</button>';form.parentNode.insertBefore(wrap,form.nextSibling);qs('#saveRecoveryPassword').onclick=async()=>{const password=qs('#recoveryPassword').value,confirm=qs('#recoveryConfirm').value;if(password.length<8)return toastMsg('Password must be at least 8 characters');if(password!==confirm)return toastMsg('Passwords do not match');const btn=qs('#saveRecoveryPassword');btn.disabled=true;try{const {error}=await cloud.auth.updatePassword(password);if(error)throw error;wrap.remove();history.replaceState({},document.title,location.pathname);setStatus('Password updated. You are signed in securely.');toastMsg('Password updated');}catch(err){toastMsg(errorText(err));}finally{if(document.body.contains(btn))btn.disabled=false;}};}

  cloud.auth.onChange((event,session)=>{if(event==='PASSWORD_RECOVERY'){setStatus('Choose a new password.');showRecoveryForm();}if(event==='SIGNED_IN'&&session?.user?.app_metadata?.provider==='google')setStatus('Google account connected. Loading workspace…');if(event==='USER_UPDATED')setStatus('Account updated successfully.');});

  const params=new URLSearchParams(location.search),hash=new URLSearchParams(location.hash.replace(/^#/,''));const authError=params.get('error_description')||hash.get('error_description');if(authError){setStatus('Authentication failed.');toastMsg(decodeURIComponent(authError));}
})();
