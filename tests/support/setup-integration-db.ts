import { INTEGRATION_DATABASE_URL, recreateDatabase } from './test-db'

export default () => recreateDatabase(INTEGRATION_DATABASE_URL)
