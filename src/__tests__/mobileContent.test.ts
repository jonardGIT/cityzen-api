import request from 'supertest';
import app, { API_V1 } from '../app.js';
import { getTokenForRole } from './helpers/auth.js';

const BASE = `${API_V1}/mobile-content`;

describe(`mobile content role access`, () => {
  let contentEditorToken = '';
  let dispatcherToken = '';

  beforeAll(async () => {
    [contentEditorToken, dispatcherToken] = await Promise.all([
      getTokenForRole('content.editor@xypes.local'),
      getTokenForRole('dispatcher@xypes.local'),
    ]);
  });

  it('allows CITY_CONTENT_EDITOR to create mobile app content', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${contentEditorToken}`)
      .send({
        slug: `city-content-editor-${Date.now()}`,
        title: 'River advisory update',
        body: 'Water level update for Tuguegarao City residents.',
        contentType: 'advisory',
        placement: 'news',
        isPublished: false,
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'River advisory update',
      contentType: 'advisory',
      placement: 'news',
    });
  });

  it('still denies DISPATCHER mobile app content writes', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({
        slug: `dispatcher-blocked-${Date.now()}`,
        title: 'Should not publish',
        body: 'Dispatch staff must not publish city content.',
      });

    expect(res.status).toBe(403);
  });
});
