<?php

declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['success' => false, 'error' => 'Método no permitido.']);
}

$origin = rtrim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''), '/');
$allowedOrigins = ['https://grupoinmarca.com', 'https://www.grupoinmarca.com'];
if ($origin !== '' && !in_array($origin, $allowedOrigins, true)) {
    respond(403, ['success' => false, 'error' => 'Origen no permitido.']);
}

$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody === false ? '' : $rawBody, true);
if (!is_array($data)) {
    respond(400, ['success' => false, 'error' => 'Solicitud no válida.']);
}

$readField = static function (string $key) use ($data): string {
    $value = $data[$key] ?? '';
    return is_string($value) || is_numeric($value) ? trim((string) $value) : '';
};

$nombre = $readField('nombre');
$telefono = $readField('telefono');
$email = $readField('email');
$mensaje = $readField('mensaje');

if ($nombre === '' || $telefono === '' || $email === '' || $mensaje === '') {
    respond(400, ['success' => false, 'error' => 'Faltan campos requeridos.']);
}
if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    respond(400, ['success' => false, 'error' => 'El correo electrónico no es válido.']);
}
if (strlen($nombre) > 300 || strlen($telefono) > 80 || strlen($email) > 320 || strlen($mensaje) > 12000) {
    respond(400, ['success' => false, 'error' => 'La solicitud supera el tamaño permitido.']);
}

$configPath = __DIR__ . '/config.php';
if (!is_file($configPath)) {
    respond(503, ['success' => false, 'error' => 'El formulario requiere configuración de correo en el servidor.']);
}
$config = require $configPath;
if (!is_array($config)) {
    respond(503, ['success' => false, 'error' => 'El formulario requiere configuración de correo en el servidor.']);
}
$requiredConfig = ['smtp_host', 'smtp_username', 'smtp_password', 'from_email', 'to_email'];
foreach ($requiredConfig as $key) {
    if (!isset($config[$key]) || !is_string($config[$key]) || trim($config[$key]) === '') {
        respond(503, ['success' => false, 'error' => 'El formulario requiere configuración de correo en el servidor.']);
    }
}

require_once __DIR__ . '/PHPMailer/src/Exception.php';
require_once __DIR__ . '/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/src/SMTP.php';

$escape = static function (string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
};

$mail = new PHPMailer(true);
try {
    $mail->isSMTP();
    $mail->Host = $config['smtp_host'];
    $mail->SMTPAuth = true;
    $mail->Username = $config['smtp_username'];
    $mail->Password = $config['smtp_password'];
    $mail->SMTPSecure = isset($config['smtp_secure']) ? (string) $config['smtp_secure'] : 'tls';
    $mail->Port = isset($config['smtp_port']) ? (int) $config['smtp_port'] : 587;
    $mail->Timeout = 20;
    $mail->CharSet = 'UTF-8';
    $mail->setFrom($config['from_email'], $config['from_name'] ?? 'Formulario Web');
    $mail->addAddress($config['to_email']);
    $mail->addReplyTo($email, $nombre);
    $mail->isHTML(true);
    $mail->Subject = 'Nuevo mensaje de contacto desde la web';
    $mail->Body = '<div style="background:#f7f7f7;padding:32px 0;font-family:sans-serif;">'
        . '<div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;padding:28px;">'
        . '<p style="text-align:center"><img src="https://grupoinmarca.com/logo-inmarca.png.png" alt="Grupo Inmarca" style="max-width:180px;max-height:80px"></p>'
        . '<h2>Nuevo mensaje de contacto</h2>'
        . '<p><strong>Nombre:</strong> ' . $escape($nombre) . '</p>'
        . '<p><strong>Teléfono:</strong> ' . $escape($telefono) . '</p>'
        . '<p><strong>Correo:</strong> ' . $escape($email) . '</p>'
        . '<p><strong>Mensaje:</strong><br>' . nl2br($escape($mensaje), false) . '</p>'
        . '<p style="color:#777">Grupo Inmarca &copy; ' . date('Y') . '</p>'
        . '</div></div>';
    $mail->AltBody = "Nuevo mensaje de contacto\n\nNombre: {$nombre}\nTeléfono: {$telefono}\nCorreo: {$email}\n\nMensaje:\n{$mensaje}";
    $mail->send();
    respond(200, ['success' => true]);
} catch (Throwable $exception) {
    error_log('Grupo Inmarca contact form: mail delivery failed.');
    respond(500, ['success' => false, 'error' => 'No fue posible enviar el mensaje. Intenta por WhatsApp.']);
}
