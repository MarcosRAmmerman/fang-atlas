import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/browser',timeout:60000,use:{baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000},launchOptions:{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'},headless:true},reporter:'list'});
