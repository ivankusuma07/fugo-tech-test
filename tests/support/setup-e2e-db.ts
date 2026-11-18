import { E2E_DATABASE_URL, recreateDatabase } from './test-db'

export default () => recreateDatabase(E2E_DATABASE_URL)
