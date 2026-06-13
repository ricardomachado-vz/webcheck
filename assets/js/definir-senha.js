async function iniciarDefinicaoSenha(){

    const parametrosLink = new URLSearchParams(window.location.hash.slice(1));
    const erroLink = obterErroDoLink(parametrosLink);
    const tipoLink = parametrosLink.get('type');
    const possuiToken = parametrosLink.has('access_token');

    if(erroLink){
        exibirMensagemSenha(erroLink, 'danger');
        return;
    }

    if(!possuiToken || !['invite', 'recovery'].includes(tipoLink)){
        exibirMensagemSenha(
            'Abra esta página pelo link recebido no email de convite.',
            'danger'
        );
        return;
    }

    const { data, error } = await supabaseClient.auth.getSession();

    if(error || !data.session){
        exibirMensagemSenha(
            'Este convite é inválido ou expirou. Solicite um novo convite ao administrador.',
            'danger'
        );
        return;
    }

    document.getElementById('formDefinirSenha').classList.remove('d-none');
}

async function definirSenha(event){

    event.preventDefault();

    const senha = document.getElementById('novaSenha').value;
    const confirmacao = document.getElementById('confirmarSenha').value;
    const botao = document.getElementById('btnDefinirSenha');

    if(senha !== confirmacao){
        exibirMensagemSenha('As senhas informadas não são iguais.', 'danger');
        return;
    }

    botao.disabled = true;
    botao.textContent = 'Salvando...';

    const { error } = await supabaseClient.auth.updateUser({
        password: senha,
    });

    if(error){
        botao.disabled = false;
        botao.textContent = 'Definir senha';
        exibirMensagemSenha(error.message, 'danger');
        return;
    }

    await supabaseClient.auth.signOut();

    document.getElementById('formDefinirSenha').classList.add('d-none');
    exibirMensagemSenha(
        'Senha definida com sucesso. Você já pode entrar no WebCheck.',
        'success'
    );

    setTimeout(() => {
        window.location.href = '../index.html';
    }, 2000);
}

function obterErroDoLink(parametros){
    const descricao = parametros.get('error_description');

    return descricao ? decodeURIComponent(descricao.replace(/\+/g, ' ')) : '';
}

function exibirMensagemSenha(mensagem, tipo){

    const alerta = document.getElementById('mensagemSenha');

    alerta.className = `alert alert-${tipo}`;
    alerta.textContent = mensagem;
}

iniciarDefinicaoSenha();
