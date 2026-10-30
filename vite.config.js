import {defineConfig} from 'vite';
export default defineConfig({base:'./',server:{fs:{deny:['**/CAD/**','**/.local/**','**/.git/**','**/.env*']}}});
