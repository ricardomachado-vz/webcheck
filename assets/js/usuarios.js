async function buscarUsuario(){

    const { data } =
        await supabaseClient.auth.getSession();

    const userId =
        data.session.user.id;

    console.log(userId);

}