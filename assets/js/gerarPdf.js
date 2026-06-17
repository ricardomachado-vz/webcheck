(function () {
    const form = document.getElementById('formChecklist');
    const botao = document.getElementById('emitirPdf');

    if (!form || !botao) {
        return;
    }

    const VALOR_NAO_INFORMADO = 'Não informado';
    const RESPOSTA_NAO_MARCADA = 'Não respondido';

    function textoLimpo(valor) {
        return valor?.replace(/\s+/g, ' ').trim() || '';
    }

    function valorCampo(campo) {
        return textoLimpo(campo.value) || VALOR_NAO_INFORMADO;
    }

    function obterResposta(item) {
        const marcado = item.querySelector('input[type="radio"]:checked');

        if (!marcado) {
            return RESPOSTA_NAO_MARCADA;
        }

        const label = item.querySelector(`label[for="${marcado.id}"]`);
        return textoLimpo(label?.textContent) || marcado.value || RESPOSTA_NAO_MARCADA;
    }

    function obterGruposConteudo() {
        const blocos = Array.from(form.querySelectorAll(':scope > .bloco'));

        if (blocos.length) {
            return blocos.map((bloco) => ({
                titulo: textoLimpo(bloco.querySelector(':scope > h3')?.textContent),
                elemento: bloco
            }));
        }

        const grupos = [];
        let tituloAtual = '';

        Array.from(form.children).forEach((filho) => {
            if (filho.matches('.title, .title2')) {
                tituloAtual = textoLimpo(filho.textContent);
                return;
            }

            if (filho.matches('section') && !filho.classList.contains('final-sec')) {
                grupos.push({
                    titulo: tituloAtual,
                    elemento: filho
                });
            }
        });

        return grupos;
    }

    function obterDescricaoRegistro(registro) {
        return textoLimpo(
            registro.querySelector('.content, .content2, .content3, .content4')?.textContent
        );
    }

    function obterValorRegistro(registro) {
        const controle = registro.querySelector('textarea, input:not([type="radio"]):not([type="file"]), select');
        return controle ? valorCampo(controle) : '';
    }

    function obterDadosFormulario() {
        const secoes = [];
        const assinaturas = Array.from(form.querySelectorAll('[data-assinatura]'))
            .map((assinatura) => textoLimpo(assinatura.dataset.assinatura))
            .filter(Boolean);

        obterGruposConteudo().forEach((grupo) => {
            const bloco = grupo.elemento;
            const titulo = grupo.titulo;
            const campos = [];
            const itens = [];
            const observacoes = [];

            bloco.querySelectorAll(':scope > .linha .campo').forEach((campo) => {
                const label = textoLimpo(campo.querySelector('label')?.textContent);
                const controle = campo.querySelector('input:not([type="file"]), textarea, select');

                if (label && controle) {
                    campos.push({
                        label,
                        valor: valorCampo(controle),
                        fotoId: campo.dataset.foto || null
                    });
                }
            });

            bloco.querySelectorAll(':scope > .list1, :scope > .list2, :scope > .list3, :scope > .list4').forEach((item) => {
                const descricao = obterDescricaoRegistro(item);
                const observacao = item.querySelector('.obs textarea');
                const temResposta = item.querySelector('input[type="radio"]');
                const valor = obterValorRegistro(item);

                if (descricao && temResposta) {
                    itens.push({
                        descricao,
                        resposta: obterResposta(item),
                        observacao: valor,
                        fotoId: item.dataset.foto || null
                    });
                } else if (descricao && valor) {
                    campos.push({
                        label: descricao,
                        valor,
                        fotoId: item.dataset.foto || null
                    });
                }

                if (observacao) {
                    observacoes.push(valorCampo(observacao));
                }
            });

            if (titulo || campos.length || itens.length || observacoes.length) {
                secoes.push({
                    titulo: titulo || 'Informações',
                    campos,
                    itens,
                    observacoes
                });
            }
        });

        return {
            titulo: form.dataset.pdfTitulo || textoLimpo(document.querySelector('.checklist-title h2')?.textContent),
            secoes,
            assinaturas,
            fotos: typeof window.obterFotosChecklist === 'function'
                ? window.obterFotosChecklist()
                : []
        };
    }

    function adicionarCabecalho(doc, titulo) {
        const larguraPagina = doc.internal.pageSize.getWidth();

        doc.setFillColor(17, 24, 39);
        doc.rect(0, 0, larguraPagina, 24, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('WebCheck', 14, 10);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Relatório de manutenção preventiva', 14, 17);

        doc.setTextColor(17, 24, 39);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        const linhasTitulo = doc.splitTextToSize(titulo, larguraPagina - 28);
        doc.text(linhasTitulo, 14, 34);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(90, 90, 90);
        doc.text(
            `Emitido em ${new Date().toLocaleString('pt-BR')}`,
            14,
            35 + linhasTitulo.length * 6
        );

        return 43 + linhasTitulo.length * 6;
    }

    function garantirEspaco(doc, y, altura, titulo) {
        const alturaPagina = doc.internal.pageSize.getHeight();

        if (y + altura <= alturaPagina - 18) {
            return y;
        }

        doc.addPage();
        return adicionarCabecalho(doc, titulo);
    }

    function adicionarTituloSecao(doc, titulo, y, tituloDocumento) {
        const larguraPagina = doc.internal.pageSize.getWidth();
        const posicao = garantirEspaco(doc, y, 15, tituloDocumento);

        doc.setFillColor(233, 236, 239);
        doc.roundedRect(14, posicao, larguraPagina - 28, 10, 1.5, 1.5, 'F');
        doc.setTextColor(17, 24, 39);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(titulo, 18, posicao + 6.5);

        return posicao + 14;
    }

    function adicionarTabela(doc, cabecalho, linhas, y) {
        if (!linhas.length) {
            return y;
        }

        doc.autoTable({
            startY: y,
            head: [cabecalho],
            body: linhas,
            margin: { left: 14, right: 14, top: 30, bottom: 18 },
            theme: 'grid',
            styles: {
                font: 'helvetica',
                fontSize: 8.5,
                cellPadding: 3,
                lineColor: [190, 195, 200],
                lineWidth: 0.2,
                overflow: 'linebreak',
                valign: 'middle'
            },
            headStyles: {
                fillColor: [17, 24, 39],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [247, 248, 249]
            },
            didDrawPage: () => {
                if (doc.internal.getCurrentPageInfo().pageNumber > 1) {
                    doc.setFillColor(17, 24, 39);
                    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 24, 'F');
                    doc.setTextColor(255, 255, 255);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(12);
                    doc.text('WebCheck', 14, 10);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.text('Relatório de manutenção preventiva', 14, 17);
                }
            }
        });

        return doc.lastAutoTable.finalY + 8;
    }

    function adicionarObservacoes(doc, observacoes, y, tituloDocumento) {
        observacoes.forEach((observacao, indice) => {
            const linhas = doc.splitTextToSize(observacao, doc.internal.pageSize.getWidth() - 36);
            const altura = Math.max(16, linhas.length * 5 + 10);
            y = garantirEspaco(doc, y, altura, tituloDocumento);

            doc.setDrawColor(160, 165, 170);
            doc.setFillColor(250, 250, 250);
            doc.roundedRect(14, y, doc.internal.pageSize.getWidth() - 28, altura, 1.5, 1.5, 'FD');
            doc.setTextColor(17, 24, 39);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.text(`Observação${observacoes.length > 1 ? ` ${indice + 1}` : ''}`, 18, y + 6);
            doc.setFont('helvetica', 'normal');
            doc.text(linhas, 18, y + 12);
            y += altura + 6;
        });

        return y;
    }

    function carregarImagem(dataUrl) {
        return new Promise((resolve, reject) => {
            const imagem = new Image();
            imagem.onload = () => resolve(imagem);
            imagem.onerror = reject;
            imagem.src = dataUrl;
        });
    }

    async function prepararImagem(dataUrl) {
        const imagem = await carregarImagem(dataUrl);
        const limite = 1600;
        const escala = Math.min(1, limite / Math.max(imagem.naturalWidth, imagem.naturalHeight));
        const canvas = document.createElement('canvas');

        canvas.width = Math.max(1, Math.round(imagem.naturalWidth * escala));
        canvas.height = Math.max(1, Math.round(imagem.naturalHeight * escala));
        canvas.getContext('2d').drawImage(imagem, 0, 0, canvas.width, canvas.height);

        return {
            dataUrl: canvas.toDataURL('image/jpeg', 0.82),
            largura: canvas.width,
            altura: canvas.height
        };
    }

    function dimensoesImagem(imagem) {
        const larguraMaxima = 150;
        const alturaMaxima = 95;
        const escala = Math.min(
            larguraMaxima / imagem.largura,
            alturaMaxima / imagem.altura
        );

        return {
            largura: imagem.largura * escala,
            altura: imagem.altura * escala
        };
    }

    function adicionarFotoRelacionada(doc, foto, imagem, y) {
        const dimensoes = dimensoesImagem(imagem);
        const larguraPagina = doc.internal.pageSize.getWidth();

        doc.setFillColor(247, 248, 249);
        doc.setDrawColor(190, 195, 200);
        doc.roundedRect(
            14,
            y,
            larguraPagina - 28,
            dimensoes.altura + 15,
            1.5,
            1.5,
            'FD'
        );
        doc.addImage(
            imagem.dataUrl,
            'JPEG',
            18,
            y + 4,
            dimensoes.largura,
            dimensoes.altura,
            undefined,
            'FAST'
        );
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(90, 90, 90);
        doc.text(
            `Foto relacionada: ${foto.nome}`,
            18,
            y + dimensoes.altura + 10
        );

        return y + dimensoes.altura + 21;
    }

    async function adicionarRegistrosComFotos(
        doc,
        cabecalho,
        registros,
        montarLinha,
        fotosPorId,
        y,
        tituloDocumento
    ) {
        let linhasPendentes = [];

        const adicionarPendentes = () => {
            y = adicionarTabela(doc, cabecalho, linhasPendentes, y);
            linhasPendentes = [];
        };

        for (const registro of registros) {
            const foto = registro.fotoId
                ? fotosPorId.get(registro.fotoId)
                : null;

            if (!foto) {
                linhasPendentes.push(montarLinha(registro));
                continue;
            }

            adicionarPendentes();

            const imagem = await prepararImagem(foto.dataUrl);
            const dimensoes = dimensoesImagem(imagem);

            y = garantirEspaco(
                doc,
                y,
                dimensoes.altura + 42,
                tituloDocumento
            );
            y = adicionarTabela(
                doc,
                cabecalho,
                [montarLinha(registro)],
                y
            );
            y = adicionarFotoRelacionada(doc, foto, imagem, y);
        }

        adicionarPendentes();
        return y;
    }

    function adicionarAssinaturas(doc, assinaturas, y, tituloDocumento) {
        if (!assinaturas.length) {
            return y;
        }

        y = adicionarTituloSecao(doc, 'Assinaturas', y, tituloDocumento);

        const larguraPagina = doc.internal.pageSize.getWidth();
        const margem = 14;
        const espacoEntreColunas = 14;
        const larguraColuna = (larguraPagina - margem * 2 - espacoEntreColunas) / 2;
        const alturaBloco = 32;

        assinaturas.forEach((assinatura, indice) => {
            if (indice % 2 === 0) {
                y = garantirEspaco(doc, y, alturaBloco, tituloDocumento);
            }

            const coluna = indice % 2;
            const x = margem + coluna * (larguraColuna + espacoEntreColunas);

            doc.setDrawColor(17, 24, 39);
            doc.setLineWidth(0.4);
            doc.line(x, y + 17, x + larguraColuna, y + 17);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(17, 24, 39);
            doc.text(assinatura, x + larguraColuna / 2, y + 23, { align: 'center' });

            if (coluna === 1 || indice === assinaturas.length - 1) {
                y += alturaBloco;
            }
        });

        return y + 4;
    }

    function adicionarRodapes(doc) {
        const totalPaginas = doc.getNumberOfPages();
        const larguraPagina = doc.internal.pageSize.getWidth();
        const alturaPagina = doc.internal.pageSize.getHeight();

        for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
            doc.setPage(pagina);
            doc.setDrawColor(190, 195, 200);
            doc.line(14, alturaPagina - 13, larguraPagina - 14, alturaPagina - 13);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text('WebCheck', 14, alturaPagina - 8);
            doc.text(
                `Página ${pagina} de ${totalPaginas}`,
                larguraPagina - 14,
                alturaPagina - 8,
                { align: 'right' }
            );
        }
    }

    function nomeArquivo(titulo) {
        const normalizado = titulo
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .toLowerCase();
        const data = new Date().toISOString().slice(0, 10);

        return `${normalizado || 'checklist'}-${data}.pdf`;
    }

    function baixarBlob(blob, nome) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = nome;
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function entregarPdf(doc, titulo) {
        const nome = nomeArquivo(titulo);
        const blob = doc.output('blob');

        baixarBlob(blob, nome);
    }

    async function gerarPdf() {
        if (!window.jspdf?.jsPDF) {
            throw new Error('A biblioteca de geração de PDF não foi carregada.');
        }

        const dados = obterDadosFormulario();
        const doc = new window.jspdf.jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });
        let y = adicionarCabecalho(doc, dados.titulo);
        const fotosPorId = new Map(
            dados.fotos.map((foto) => [foto.id, foto])
        );

        for (const secao of dados.secoes) {
            y = adicionarTituloSecao(doc, secao.titulo, y, dados.titulo);
            y = await adicionarRegistrosComFotos(
                doc,
                ['Campo', 'Informação preenchida'],
                secao.campos,
                (campo) => [campo.label, campo.valor],
                fotosPorId,
                y,
                dados.titulo
            );
            y = await adicionarRegistrosComFotos(
                doc,
                ['Item de inspeção', 'Resposta', 'Observação'],
                secao.itens,
                (item) => [item.descricao, item.resposta, item.observacao || ''],
                fotosPorId,
                y,
                dados.titulo
            );
            y = adicionarObservacoes(doc, secao.observacoes, y, dados.titulo);
        }

        y = adicionarAssinaturas(doc, dados.assinaturas, y, dados.titulo);
        adicionarRodapes(doc);
        entregarPdf(doc, dados.titulo);
    }

    botao.addEventListener('click', async () => {
        const texto = botao.querySelector('span');
        const textoOriginal = texto.textContent;

        botao.disabled = true;
        botao.classList.add('gerando');
        texto.textContent = 'Gerando PDF...';

        try {
            await gerarPdf();
        } catch (erro) {
            console.error(erro);
            window.alert('Não foi possível gerar o PDF. Tente novamente.');
        } finally {
            botao.disabled = false;
            botao.classList.remove('gerando');
            texto.textContent = textoOriginal;
        }
    });

    window.webcheckPdf = {
        obterDadosFormulario,
        gerarPdf
    };
})();
