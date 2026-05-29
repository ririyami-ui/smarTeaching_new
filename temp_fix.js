const fs = require('fs');
let c = fs.readFileSync('src/components/DashboardLayout.tsx','utf8');
const s = c.indexOf('{/* Mobile Bottom Navigation - Premium Glassmorphic Bar */}');
const e = c.indexOf('</nav>', s);
if(s<0||e<0){process.exit(1)}
const block = [
'      {/* Mobile Bottom Navigation - Premium Glassmorphic Bar */}',
'      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bottom-nav bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border-t border-gray-100 dark:border-gray-800/50 shadow-[0_-8px_30px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom,0px)]">',
'        <div className="flex items-center justify-around h-16 px-2">',
'          {footerNavItems.map((item) => {',
'            const isActive = location.pathname === item.path;',
'            return (',
'              <Link',
'                key={item.path}',
'                to={item.path}',
'                className={elative flex-1 flex flex-col items-center justify-center h-full transition-all duration-300 $' + '{',
'                  isActive ? ' + "'text-primary'" + ' : ' + "'text-gray-400 dark:text-gray-500'",
'                }}',
'              >',
'                <div className="relative flex flex-col items-center justify-center gap-0.5">',
'                  <div',
'                    className={elative flex items-center justify-center w-12 h-8 rounded-2xl transition-all duration-300 $' + '{',
'                      isActive',
'                        ? ' + "'bg-primary/15 dark:bg-primary/20 scale-105 shadow-sm'" + '',
'                        : ' + "'active:scale-90'",
'                    }}',
'                  >',
'                    {React.cloneElement(item.icon, {',
'                      size: 20,',
'                      strokeWidth: isActive ? 2.5 : 1.8,',
'                      className: 	ransition-all duration-300 $' + '{isActive ? ' + "'opacity-100'" + ' : ' + "'opacity-60 group-hover:opacity-80'}",
'                    })}',
'                    {isActive && (',
'                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_rgba(99,102,241,0.8)]" />',
'                    )}',
'                  </div>',
'                  <span',
'                    className={	ext-[10px] font-bold tracking-tight text-center transition-all duration-300 $' + '{',
'                      isActive',
'                        ? ' + "'opacity-100 translate-y-0 font-extrabold'" + '',
'                        : ' + "'opacity-60'",
'                    }}',
'                  >',
'                    {item.shortName || item.name}',
'                  </span>',
'                </div>',
'              </Link>',
'            );',
'          })}',
'        </div>',
'      </nav>'
].join('\n');
c = c.substring(0,s) + block + c.substring(e+7);
fs.writeFileSync('src/components/DashboardLayout.tsx',c,'utf8');
console.log('done');
