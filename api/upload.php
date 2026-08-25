<?php
require 'helpers.php';

// Endpoint para upload de arquivos/imagens (Capas de Cursos, Thumbnails de Aulas, Anexos)
if (method() === 'POST') {
    $uploadDir = __DIR__ . '/../assets/uploads/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    // 1. Upload via multipart/form-data ($_FILES)
    if (!empty($_FILES['file'])) {
        $file = $_FILES['file'];
        $error = $file['error'];

        if ($error !== UPLOAD_ERR_OK) {
            error('Erro ao enviar o arquivo: código ' . $error, 400);
        }

        $fileName = $file['name'];
        $fileTmp  = $file['tmp_name'];
        $ext      = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

        $allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'pdf', 'mp4'];
        if (!in_array($ext, $allowedExts)) {
            error('Extensão de arquivo não permitida. Extensões aceitas: ' . implode(', ', $allowedExts), 400);
        }

        $newFileName = gen_uuid() . '.' . $ext;
        $destination = $uploadDir . $newFileName;

        if (move_uploaded_file($fileTmp, $destination)) {
            $publicUrl = 'assets/uploads/' . $newFileName;
            respond([
                'ok' => true,
                'url' => $publicUrl,
                'filename' => $newFileName,
                'message' => 'Upload realizado com sucesso'
            ]);
        } else {
            error('Falha ao salvar o arquivo no servidor', 500);
        }
    }

    // 2. Upload via Base64 JSON body
    $b = body();
    if (!empty($b['base64'])) {
        $base64Data = $b['base64'];
        if (preg_match('/^data:image\/(\w+);base64,/', $base64Data, $type)) {
            $data = substr($base64Data, strpos($base64Data, ',') + 1);
            $type = strtolower($type[1]);

            $data = base64_decode($data);
            if ($data === false) {
                error('Dados Base64 inválidos', 400);
            }

            $newFileName = gen_uuid() . '.' . $type;
            $destination = $uploadDir . $newFileName;

            if (file_put_contents($destination, $data)) {
                $publicUrl = 'assets/uploads/' . $newFileName;
                respond([
                    'ok' => true,
                    'url' => $publicUrl,
                    'filename' => $newFileName,
                    'message' => 'Upload Base64 realizado com sucesso'
                ]);
            } else {
                error('Erro ao salvar imagem Base64', 500);
            }
        } else {
            error('Formato de dados Base64 não reconhecido', 400);
        }
    }

    error('Nenhum arquivo enviado', 400);
}

error('Método não permitido', 405);
