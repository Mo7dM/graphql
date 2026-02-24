import { signin,getToken } from "./auth.js"

const form = document.getElementById("loginForm")
const errorP = document.getElementById("error")

if (getToken()){
    window.location.href="/profile.html"
}

form.addEventListener("submit",async(e)=>{
    e.preventDefault();
    errorP.hidden=true;

    const login = document.getElementById("login").value.trim();
    const password = document.getElementById("password").value;

    try{
        await signin(login,password);
        window.location.href="/profile.html";
    } catch (err){
        errorP.textContent = err.message  || "Login failed";
        errorP.hidden=false;
    }
})