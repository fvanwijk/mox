var path = typeof window.__karma__ !== 'undefined' ? 'base/' : '';
jasmine.getJSONFixtures().fixturesPath = path + 'test/mock/json';
jasmine.getFixtures().fixturesPath = path + 'test/mock/html';
