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

Deno.serve(async (req: Request) => {

    if(req.method === "OPTIONS"){
        return new Response("ok", { headers: corsHeaders });
    }

    if(req.method !== "POST"){
        return jsonResponse({ error: "Metodo nao permitido." }, 405);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if(!token || !supabaseUrl || !serviceRoleKey){
        return jsonResponse({ error: "Sessao ou configuracao invalida." }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: userData, error: userError } =
        await supabaseAdmin.auth.getUser(token);

    if(userError || !userData.user){
        return jsonResponse({ error: "Sessao invalida." }, 401);
    }

    const { data: perfilAdmin } = await supabaseAdmin
        .from("usuarios")
        .select("tipo")
        .eq("id", userData.user.id)
        .single();

    if(perfilAdmin?.tipo !== "admin"){
        return jsonResponse({ error: "Apenas administradores podem gerenciar usuarios." }, 403);
    }

    const payload = await req.json();
    const acao = String(payload.acao || "");
    const usuarioId = String(payload.id || "");

    if(!usuarioId){
        return jsonResponse({ error: "Usuario nao informado." }, 400);
    }

    if(acao === "atualizar"){
        const nome = String(payload.nome || "").trim();
        const email = String(payload.email || "").trim().toLowerCase();
        const celular = String(payload.celular || "").trim();
        const tipo = String(payload.tipo || "").trim();

        if(!nome || !email || !["admin", "user"].includes(tipo)){
            return jsonResponse({ error: "Preencha nome, email e tipo de acesso." }, 400);
        }

        if(usuarioId === userData.user.id && tipo !== "admin"){
            return jsonResponse({ error: "Voce nao pode remover o proprio acesso de administrador." }, 400);
        }

        const { error: authUpdateError } =
            await supabaseAdmin.auth.admin.updateUserById(usuarioId, {
                email,
                user_metadata: {
                    nome,
                    celular,
                    tipo,
                },
            });

        if(authUpdateError){
            return jsonResponse({ error: authUpdateError.message }, 400);
        }

        const { error: perfilUpdateError } = await supabaseAdmin
            .from("usuarios")
            .update({
                nome,
                email,
                celular: celular || null,
                tipo,
            })
            .eq("id", usuarioId);

        if(perfilUpdateError){
            return jsonResponse({ error: perfilUpdateError.message }, 400);
        }

        return jsonResponse({ success: true });
    }

    if(acao === "excluir"){
        if(usuarioId === userData.user.id){
            return jsonResponse({ error: "Voce nao pode excluir o proprio usuario." }, 400);
        }

        const { error: deleteError } =
            await supabaseAdmin.auth.admin.deleteUser(usuarioId);

        if(deleteError){
            return jsonResponse({ error: deleteError.message }, 400);
        }

        return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Acao invalida." }, 400);
});
