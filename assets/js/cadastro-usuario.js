let usuariosCadastrados = [];
let usuarioAdministrador = null;
let modalEditarUsuario = null;

async function validarAcessoCadastro(){

    const usuario = await usuarioPerfilPromise;

    if(!usuario || usuario.tipo !== 'admin'){
        alert('Apenas administradores podem gerenciar usuários.');
        window.location.href = 'dashboard.html';
        return null;
    }

    return usuario;
}

async function inicializarGestaoUsuarios(){

    usuarioAdministrador = await validarAcessoCadastro();

    if(!usuarioAdministrador){
        return;
    }

    modalEditarUsuario = new bootstrap.Modal(
        document.getElementById('modalEditarUsuario')
    );

    await carregarUsuarios();
}

async function carregarUsuarios(){

    const lista = document.getElementById('listaUsuarios');

    lista.replaceChildren(criarLinhaMensagem('Carregando...'));

    const { data, error } = await supabaseClient
        .from('usuarios')
        .select('id, nome, email, celular, tipo, criado_em')
        .order('nome');

    if(error){
        lista.replaceChildren(criarLinhaMensagem('Não foi possível carregar os usuários.'));
        return;
    }

    usuariosCadastrados = data || [];
    renderizarUsuarios();
}

function renderizarUsuarios(){

    const lista = document.getElementById('listaUsuarios');
    lista.replaceChildren();

    if(!usuariosCadastrados.length){
        lista.appendChild(criarLinhaMensagem('Nenhum usuário cadastrado.'));
        return;
    }

    usuariosCadastrados.forEach((usuario) => {
        const linha = document.createElement('tr');
        const colunaNome = document.createElement('td');
        const colunaEmail = document.createElement('td');
        const colunaCelular = document.createElement('td');
        const colunaTipo = document.createElement('td');
        const colunaAcoes = document.createElement('td');
        const acoes = document.createElement('div');
        const botaoEditar = document.createElement('button');
        const botaoExcluir = document.createElement('button');

        colunaNome.textContent = usuario.nome;
        colunaEmail.textContent = usuario.email;
        colunaCelular.textContent = usuario.celular || '-';
        colunaTipo.textContent = usuario.tipo === 'admin' ? 'Administrador' : 'Usuário';

        colunaAcoes.className = 'text-end';
        acoes.className = 'usuario-acoes';

        botaoEditar.type = 'button';
        botaoEditar.className = 'btn btn-sm btn-outline-primary';
        botaoEditar.textContent = 'Editar';
        botaoEditar.addEventListener('click', () => abrirEdicaoUsuario(usuario.id));

        botaoExcluir.type = 'button';
        botaoExcluir.className = 'btn btn-sm btn-outline-danger';
        botaoExcluir.textContent = 'Excluir';
        botaoExcluir.disabled = usuario.id === usuarioAdministrador.id;
        botaoExcluir.addEventListener('click', () => excluirUsuario(usuario.id));

        acoes.append(botaoEditar, botaoExcluir);
        colunaAcoes.appendChild(acoes);
        linha.append(
            colunaNome,
            colunaEmail,
            colunaCelular,
            colunaTipo,
            colunaAcoes
        );
        lista.appendChild(linha);
    });
}

function criarLinhaMensagem(mensagem){

    const linha = document.createElement('tr');
    const coluna = document.createElement('td');

    coluna.colSpan = 5;
    coluna.className = 'text-center text-secondary';
    coluna.textContent = mensagem;
    linha.appendChild(coluna);

    return linha;
}

async function cadastrarUsuario(event){

    event.preventDefault();

    const usuarioAdmin = await validarAcessoCadastro();

    if(!usuarioAdmin){
        return;
    }

    const botao = document.getElementById('btnCadastrarUsuario');
    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('emailCadastro').value.trim();
    const celular = document.getElementById('celular').value.trim();
    const tipo = document.getElementById('tipo').value;

    definirBotaoCarregando(botao, true, 'Cadastrando...');
    exibirMensagemCadastro('', '');

    const { data, error } = await supabaseClient.functions.invoke('cadastrar-usuario', {
        body: {
            nome,
            email,
            celular,
            tipo,
        },
    });

    definirBotaoCarregando(botao, false, 'Cadastrar usuário');

    if(error || data?.error){
        const mensagemErro = await obterMensagemErroFuncao(
            error,
            data,
            'Não foi possível cadastrar o usuário.'
        );

        exibirMensagemCadastro(
            mensagemErro,
            'danger'
        );
        return;
    }

    document.getElementById('formCadastroUsuario').reset();
    exibirMensagemCadastro(
        'Usuário cadastrado. O convite foi enviado para o email informado.',
        'success'
    );
    await carregarUsuarios();
}

function abrirEdicaoUsuario(usuarioId){

    const usuario = usuariosCadastrados.find((item) => item.id === usuarioId);

    if(!usuario){
        return;
    }

    document.getElementById('editarId').value = usuario.id;
    document.getElementById('editarNome').value = usuario.nome;
    document.getElementById('editarEmail').value = usuario.email;
    document.getElementById('editarCelular').value = usuario.celular || '';
    document.getElementById('editarTipo').value = usuario.tipo;
    document.getElementById('editarTipo').disabled =
        usuario.id === usuarioAdministrador.id;

    modalEditarUsuario.show();
}

async function salvarUsuario(event){

    event.preventDefault();

    const botao = document.getElementById('btnSalvarUsuario');
    const payload = {
        acao: 'atualizar',
        id: document.getElementById('editarId').value,
        nome: document.getElementById('editarNome').value.trim(),
        email: document.getElementById('editarEmail').value.trim(),
        celular: document.getElementById('editarCelular').value.trim(),
        tipo: document.getElementById('editarTipo').value,
    };

    definirBotaoCarregando(botao, true, 'Salvando...');

    const { data, error } = await supabaseClient.functions.invoke('gerenciar-usuario', {
        body: payload,
    });

    definirBotaoCarregando(botao, false, 'Salvar alterações');

    if(error || data?.error){
        exibirMensagemCadastro(
            data?.error || error.message || 'Não foi possível atualizar o usuário.',
            'danger'
        );
        return;
    }

    modalEditarUsuario.hide();
    exibirMensagemCadastro('Usuário atualizado com sucesso.', 'success');
    await carregarUsuarios();
}

async function excluirUsuario(usuarioId){

    const usuario = usuariosCadastrados.find((item) => item.id === usuarioId);

    if(!usuario || !confirm(`Excluir o usuário ${usuario.nome}?`)){
        return;
    }

    const { data, error } = await supabaseClient.functions.invoke('gerenciar-usuario', {
        body: {
            acao: 'excluir',
            id: usuario.id,
        },
    });

    if(error || data?.error){
        exibirMensagemCadastro(
            data?.error || error.message || 'Não foi possível excluir o usuário.',
            'danger'
        );
        return;
    }

    exibirMensagemCadastro('Usuário excluído com sucesso.', 'success');
    await carregarUsuarios();
}

function definirBotaoCarregando(botao, carregando, texto){
    botao.disabled = carregando;
    botao.textContent = texto;
}

async function obterMensagemErroFuncao(error, data, mensagemPadrao){

    if(data?.error){
        return data.error;
    }

    if(error?.context instanceof Response){
        try{
            const resposta = await error.context.json();

            if(resposta?.error){
                return resposta.error;
            }
        }catch{
            return error.message || mensagemPadrao;
        }
    }

    return error?.message || mensagemPadrao;
}

function exibirMensagemCadastro(mensagem, tipo){

    const alerta = document.getElementById('mensagemCadastro');

    if(!alerta){
        return;
    }

    alerta.className = 'alert d-none';
    alerta.textContent = '';

    if(!mensagem){
        return;
    }

    alerta.classList.remove('d-none');
    alerta.classList.add(`alert-${tipo}`);
    alerta.textContent = mensagem;
    alerta.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

inicializarGestaoUsuarios();
