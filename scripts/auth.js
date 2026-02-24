import { AUTH_URL,TOKEN_KEY } from "./config.js";

export function getToken(){
    return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token){
    sessionStorage.setItem(TOKEN_KEY,token)
}

export function clearToken(){
    return sessionStorage.removeItem(TOKEN_KEY);
}

export function logout(){
    clearToken();
    window.dispatchEvent(new CustomEvent("auth:logout"));
}

export async function signin(username,password){
    const basic = btoa(`${username}:${password}`)

    const res = await fetch(AUTH_URL,{
        method: "POST",
        headers: {Authorization:`Basic ${basic}`}
    });

    if (!res.ok){
        throw new Error("Invalid username/email or password");
    }

    const token = await res.json();
    if (!token||token.length<10) throw new Error("token not received");
    setToken(token)
    return token;
}