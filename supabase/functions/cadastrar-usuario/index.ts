import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200){
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
        },
    });
}

function obterRedirectConvite(req: Request){
    const origin = req.headers.get("Origin");

    if(!origin){
        return null;
    }

    try{
        const url = new URL(origin);
        const origemLocal =
            url.hostname === "localhost" ||
            url.hostname === "127.0.0.1";
        const protocoloPermitido =
            url.protocol === "https:" ||
            (origemLocal && url.protocol === "http:");

        if(!protocoloPermitido){
            return null;
        }

        return `${url.origin}/pages/definir-senha.html`;
    }catch{
        return null;
    }
}

function obterErroConvite(error: { code?: string; message?: string; status?: number }){
    if(error.code === "over_email_send_rate_limit" || error.status === 429){
        return {
            status: 429,
            message: "O limite temporario de envio de emails do Supabase foi atingido. Aguarde antes de enviar um novo convite ou configure um servidor SMTP proprio.",
        };
    }

    if(error.code === "email_address_not_authorized"){
        return {
            status: 400,
            message: "O email informado nao esta autorizado pelo servidor de testes do Supabase. Configure um servidor SMTP proprio para enviar convites a qualquer endereco.",
        };
    }

    if(error.code === "email_exists"){
        return {
            status: 409,
            message: "Ja existe um usuario cadastrado com este email.",
        };
    }

    return {
        status: error.status || 400,
        message: error.message || "Nao foi possivel criar o convite.",
    };
}

Deno.serve(async (req: Request) => {

    if(req.method === "OPTIONS"){
        return new Response("ok", { headers: corsHeaders });
    }

    if(req.method !== "POST"){
        return jsonResponse({ error: "Metodo nao permitido." }, 405);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if(!token){
        return jsonResponse({ error: "Sessao nao encontrada." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if(!supabaseUrl || !serviceRoleKey){
        return jsonResponse({ error: "Configuracao do Supabase incompleta." }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: userData, error: userError } =
        await supabaseAdmin.auth.getUser(token);

    if(userError || !userData.user){
        return jsonResponse({ error: "Sessao invalida." }, 401);
    }

    const { data: perfilAdmin, error: perfilError } = await supabaseAdmin
        .from("usuarios")
        .select("id, tipo")
        .eq("id", userData.user.id)
        .single();

    if(perfilError || perfilAdmin?.tipo !== "admin"){
        return jsonResponse({ error: "Apenas administradores podem cadastrar usuarios." }, 403);
    }

    const redirectTo = obterRedirectConvite(req);

    if(!redirectTo){
        return jsonResponse({ error: "Origem da aplicacao nao permitida." }, 400);
    }

    const { nome, email, celular, tipo } = await req.json();

    const nomeNormalizado = String(nome || "").trim();
    const emailNormalizado = String(email || "").trim().toLowerCase();
    const celularNormalizado = String(celular || "").trim();
    const tipoNormalizado = String(tipo || "").trim();

    if(!nomeNormalizado || !emailNormalizado || !["admin", "user"].includes(tipoNormalizado)){
        return jsonResponse({ error: "Preencha nome, email e tipo de acesso." }, 400);
    }

    const { data: convite, error: conviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(emailNormalizado, {
            redirectTo,
            data: {
                nome: nomeNormalizado,
                celular: celularNormalizado,
                tipo: tipoNormalizado,
            },
        });

    if(conviteError || !convite.user){
        const erroConvite = obterErroConvite(conviteError || {});

        return jsonResponse({
            error: erroConvite.message,
            code: conviteError?.code || null,
        }, erroConvite.status);
    }

    const { error: perfilInsertError } = await supabaseAdmin
        .from("usuarios")
        .insert({
            id: convite.user.id,
            nome: nomeNormalizado,
            email: emailNormalizado,
            celular: celularNormalizado || null,
            tipo: tipoNormalizado,
        });

    if(perfilInsertError){
        await supabaseAdmin.auth.admin.deleteUser(convite.user.id);

        return jsonResponse({
            error: perfilInsertError.message || "Nao foi possivel gravar o perfil.",
        }, 400);
    }

    return jsonResponse({
        usuario: {
            id: convite.user.id,
            nome: nomeNormalizado,
            email: emailNormalizado,
            celular: celularNormalizado || null,
            tipo: tipoNormalizado,
        },
    }, 201);
});
