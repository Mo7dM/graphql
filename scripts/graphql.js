import { GQL_URL } from "./config.js";
import { getToken,logout } from "./auth.js";

export async function gql(query, variables={}){
    const token = getToken()
    if (!token){
        //no token no fun
        logout();
        return;
    }
    const res = await fetch(GQL_URL,{
        method:"POST",
        headers:{
            "Content-Type":"application/json",
            "Authorization":`Bearer ${token}`
        },
        body: JSON.stringify({query,variables})
    });

    if (res.status===401||res.status===403){
        //token is invalid😢
        logout();
        return
    }

    const data = await res.json();
    if (data.errors?.length){
        throw new Error(data.errors[0].message);
    }
    return data.data
}