(function () {
const LIMITE_FOTO_BYTES = 10 * 1024 * 1024;
const fotosChecklist = new Map();

function criarCampoFoto(elemento) {
    const identificador = elemento.dataset.foto;
    const tituloElemento = elemento.querySelector('.content, .content2, .content3, .content4');
    const titulo = elemento.dataset.fotoTitulo || tituloElemento?.textContent?.trim() || identificador;
    const inputId = `foto-${identificador}`;
    const campo = document.createElement('div');

    campo.className = 'campo-foto';
    campo.innerHTML = `
        <input
            type="file"
            id="${inputId}"
            class="campo-foto-input"
            accept="image/*"
        >
        <div class="campo-foto-acoes">
            <label class="btn btn-dark campo-foto-selecionar" for="${inputId}">
                <i class="bi bi-camera" aria-hidden="true"></i>
                <span>Adicionar foto</span>
            </label>
            <button
                type="button"
                class="btn btn-outline-danger campo-foto-remover d-none"
                title="Remover foto"
                aria-label="Remover foto de ${titulo}"
            >
                <i class="bi bi-trash" aria-hidden="true"></i>
            </button>
        </div>
        <div class="campo-foto-preview d-none">
            <img alt="Pré-visualização de ${titulo}">
            <span class="campo-foto-nome"></span>
        </div>
        <small class="campo-foto-erro text-danger d-none" role="alert"></small>
    `;

    const input = campo.querySelector('.campo-foto-input');
    const preview = campo.querySelector('.campo-foto-preview');
    const imagem = campo.querySelector('img');
    const nome = campo.querySelector('.campo-foto-nome');
    const remover = campo.querySelector('.campo-foto-remover');
    const erro = campo.querySelector('.campo-foto-erro');

    input.addEventListener('change', () => {
        const arquivo = input.files?.[0];

        erro.classList.add('d-none');

        if (!arquivo) {
            return;
        }

        if (!arquivo.type.startsWith('image/')) {
            erro.textContent = 'Selecione um arquivo de imagem.';
            erro.classList.remove('d-none');
            input.value = '';
            return;
        }

        if (arquivo.size > LIMITE_FOTO_BYTES) {
            erro.textContent = 'A imagem deve ter no máximo 10 MB.';
            erro.classList.remove('d-none');
            input.value = '';
            return;
        }

        const leitor = new FileReader();

        leitor.addEventListener('load', () => {
            const dataUrl = leitor.result;

            fotosChecklist.set(identificador, {
                id: identificador,
                titulo,
                nome: arquivo.name,
                tipo: arquivo.type,
                tamanho: arquivo.size,
                dataUrl
            });

            imagem.src = dataUrl;
            nome.textContent = arquivo.name;
            preview.classList.remove('d-none');
            remover.classList.remove('d-none');
        });

        leitor.addEventListener('error', () => {
            erro.textContent = 'Não foi possível carregar a imagem.';
            erro.classList.remove('d-none');
            input.value = '';
        });

        leitor.readAsDataURL(arquivo);
    });

    remover.addEventListener('click', () => {
        fotosChecklist.delete(identificador);
        input.value = '';
        imagem.removeAttribute('src');
        nome.textContent = '';
        preview.classList.add('d-none');
        remover.classList.add('d-none');
        erro.classList.add('d-none');
    });

    elemento.appendChild(campo);
}

document.querySelectorAll('[data-foto]').forEach(criarCampoFoto);

window.webcheckFotos = fotosChecklist;
window.obterFotosChecklist = () => Array.from(fotosChecklist.values());
})();
