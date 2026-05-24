async function verificarSessao(){

    const { data, error } =
        await supabaseClient.auth.getSession();
    if(!data.session){
        window.location.href = "../index.html";
        return;
    }
    console.log("Usuário logado.");
}

verificarSessao();
async function logout(){
    await supabaseClient.auth.signOut();
    window.location.href =
        "../index.html";
}