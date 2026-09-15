/**
 * Pruebas end-to-end de Monitos en Fuga.
 *
 * Cubren lo que pide el examen:
 *  1. abrir la aplicacion y ver la pantalla de inicio;
 *  2. iniciar una partida (POST real al backend) y ver la arena;
 *  3. la interaccion principal: mover un mono y que el servidor lo confirme;
 *  4. una accion invalida validada por el backend (golpear demasiado lejos);
 *  5. la finalizacion de la partida y la pantalla de resultado;
 *  6. la comunicacion HTTP/JSON con Express, comprobando la API directamente.
 *
 * Todas funcionan igual en local y contra la aplicacion publicada (URL_BASE).
 */

import { expect, test } from '@playwright/test';

test('la pantalla de inicio muestra el juego y sus controles', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /monitos\s*en\s*fuga/i })).toBeVisible();
  await expect(page.getByTestId('boton-iniciar')).toBeVisible();
  await expect(page.getByText('Como se juega')).toBeVisible();
});

test('iniciar una partida crea el estado en el servidor y dibuja la arena', async ({ page }) => {
  await page.goto('/');

  // Se espera la respuesta real de Express al crear la partida.
  const [respuesta] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/game') && r.request().method() === 'POST'),
    page.getByTestId('boton-iniciar').click()
  ]);

  expect(respuesta.status()).toBe(201);
  const cuerpo = await respuesta.json();
  expect(cuerpo.partida.estado).toBe('en_curso');
  expect(cuerpo.partida.jugadores.p1.vida).toBe(100);

  await expect(page.getByTestId('arena')).toBeVisible();
  await expect(page.getByTestId('jugador-p1')).toBeVisible();
  await expect(page.getByTestId('jugador-p2')).toBeVisible();
  await expect(page.getByTestId('vida-p1')).toHaveText('100');
  await expect(page.getByTestId('id-partida')).toHaveText(cuerpo.partida.id);
});

test('mover a Monito cambia su posicion en el servidor', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('boton-iniciar').click();
  await expect(page.getByTestId('arena')).toBeVisible();

  const jugador = page.getByTestId('jugador-p1');
  const xInicial = Number(await jugador.getAttribute('data-x'));

  // Se mantiene la tecla presionada un momento, como haria una persona.
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(600);
  await page.keyboard.up('KeyD');

  await expect
    .poll(async () => Number(await jugador.getAttribute('data-x')), { timeout: 5_000 })
    .toBeGreaterThan(xInicial);
});

test('el backend rechaza un golpe fuera de alcance y el error se ve en pantalla', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('boton-iniciar').click();
  await expect(page.getByTestId('arena')).toBeVisible();

  // Los monos empiezan en esquinas opuestas: golpear es invalido.
  const [respuesta] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/action') && r.request().method() === 'POST'),
    page.keyboard.press('KeyF')
  ]);

  expect(respuesta.status()).toBe(400);
  const cuerpo = await respuesta.json();
  expect(cuerpo.error.codigo).toBe('FUERA_DE_ALCANCE');

  await expect(page.getByTestId('aviso-evento')).toContainText('demasiado lejos');
});

test('terminar la partida muestra la pantalla de resultado', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('boton-iniciar').click();
  await expect(page.getByTestId('arena')).toBeVisible();

  await page.getByTestId('boton-terminar').click();

  await expect(page.getByTestId('pantalla-resultado')).toBeVisible();
  await expect(page.getByTestId('ganador')).toContainText(/Gana|Empate/);
  await expect(page.getByTestId('motivo-fin')).toContainText('antes de tiempo');

  // Desde el resultado se puede jugar otra vez.
  await page.getByTestId('boton-reiniciar').click();
  await expect(page.getByTestId('pantalla-resultado')).toBeHidden();
  await expect(page.getByTestId('temporizador')).toBeVisible();
});

test('la API responde en JSON a GET y POST', async ({ request }) => {
  const creada = await request.post('/api/game', { data: {} });
  expect(creada.status()).toBe(201);
  const { partida } = await creada.json();

  const consulta = await request.get(`/api/game/${partida.id}`);
  expect(consulta.ok()).toBeTruthy();
  expect(consulta.headers()['content-type']).toContain('application/json');

  const movimiento = await request.post(`/api/game/${partida.id}/action`, {
    data: { jugador: 'p1', tipo: 'mover', direccion: 'arriba' }
  });
  expect(movimiento.ok()).toBeTruthy();
  const estadoMovido = await movimiento.json();
  expect(estadoMovido.partida.jugadores.p1.posicion.y).toBe(partida.jugadores.p1.posicion.y - 1);

  const inexistente = await request.get('/api/game/no-existe');
  expect(inexistente.status()).toBe(404);
});
