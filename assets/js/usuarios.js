async function buscarUsuario(){

    const { data: sessionData, error: sessionError } =
        await supabaseClient.auth.getSession();

    if(sessionError || !sessionData.session){
        window.location.href = "../index.html";
        return null;
    }

    const userId = sessionData.session.user.id;

    const { data: usuario, error } = await supabaseClient
        .from('usuarios')
        .select('id, nome, email, celular, tipo')
        .eq('id', userId)
        .single();

    if(error || !usuario){
        alert('Perfil de usuário não encontrado. Entre em contato com o administrador.');
        await supabaseClient.auth.signOut();
        window.location.href = "../index.html";
        return null;
    }

    sessionStorage.setItem('usuarioPerfil', JSON.stringify(usuario));
    atualizarUsuarioNaTela(usuario);
    atualizarAcoesAdministrativas(usuario);

    return usuario;
}

function atualizarUsuarioNaTela(usuario){

    const nomeElemento = document.getElementById('usuarioNome');
    const tipoElemento = document.getElementById('usuarioTipo');

    if(nomeElemento){
        nomeElemento.textContent = usuario.nome || usuario.email || 'Usuário';
    }

    if(tipoElemento){
        tipoElemento.textContent = usuario.tipo === 'admin' ? 'Administrador' : 'Usuário';
        tipoElemento.classList.remove('d-none');
    }
}

function atualizarAcoesAdministrativas(usuario){

    const cadastroUsuario = document.getElementById('adminCadastroUsuario');
    const menuDivider = document.getElementById('adminMenuDivider');

    if(cadastroUsuario && usuario.tipo === 'admin'){
        cadastroUsuario.classList.remove('d-none');
    }

    if(menuDivider && usuario.tipo === 'admin'){
        menuDivider.classList.remove('d-none');
    }
}

const usuarioPerfilPromise = buscarUsuario();
