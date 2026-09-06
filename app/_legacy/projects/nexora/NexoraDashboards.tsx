const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0 rounded-[0.22rem] bg-[#141820] p-[0.45rem]">
    <span className="block text-[0.33rem] text-[#898f9a]">{label}</span>
    <b className="my-[0.3rem] block text-[0.62rem]">{value}</b>
    <i className="text-[0.31rem] not-italic text-[#54caa5]">↗ 12.5%</i>
  </div>
);
const board =
  'overflow-hidden rounded-[0.45rem] border border-[#292d36] bg-[linear-gradient(135deg,#101319,#07090c)] text-[#e9ecf1] shadow-[0_14px_25px_#00000014]';
export const NexoraDashboard = () => (
  <div className={`${board} grid grid-cols-[22%_1fr] aspect-[1.72] p-4 font-sans text-[0.55rem]`}>
    <aside className="flex flex-col gap-[0.7rem] text-[0.35rem] text-[#838995]">
      <b className="mb-[0.7rem] text-[0.45rem] text-[#d8dce5]">◉ NEXORA</b>
      {['Overview', 'Analytics', 'Reports', 'Projects', 'Users', 'Settings'].map((item, index) => (
        <span
          className={index === 0 ? 'rounded-[0.15rem] bg-[#1d222c] p-[0.32rem] text-white' : ''}
          key={item}
        >
          {item}
        </span>
      ))}
    </aside>
    <div className="min-w-0">
      <header className="flex justify-between text-[0.55rem]">
        <b>Overview</b>
        <span className="text-[0.38rem] text-[#89909d]">◌　◌　◌　◌</span>
      </header>
      <div className="my-[0.9rem] grid grid-cols-4 gap-[0.45rem]">
        <Metric label="Total revenue" value="$24,980" />
        <Metric label="New users" value="1,248" />
        <Metric label="Active users" value="8,642" />
        <Metric label="Conversion rate" value="3.45%" />
      </div>
      <div className="rounded-[0.22rem] bg-[#141820] p-2 text-[0.4rem]">
        <span>Revenue</span>
        <div className="mt-[0.4rem] h-[3.25rem] border-b border-[#2d3340] bg-[repeating-linear-gradient(0deg,transparent_0_18px,#252b35_19px)]" />
      </div>
    </div>
  </div>
);
export const NexoraInsightBoard = () => (
  <div className={`${board} min-h-56 p-4 text-[0.55rem]`}>
    <div className="flex justify-between">
      <b>Dashboard</b>
      <span className="text-[0.38rem] text-[#89909d]">◌　◌　◌</span>
    </div>
    <div className="my-[0.9rem] grid grid-cols-4 gap-[0.45rem]">
      <Metric label="Users" value="8,642" />
      <Metric label="Sessions" value="17,842" />
      <Metric label="Bounce rate" value="32.6%" />
      <Metric label="Session time" value="4m 12s" />
    </div>
    <div className="grid grid-cols-[1.3fr_1fr] gap-2">
      <div className="min-h-24 rounded-[0.22rem] bg-[#141820] p-2 text-[#aab0ba]">
        Users over time
        <i className="mt-2 block h-16 bg-[repeating-linear-gradient(90deg,#356dd5_0_5px,transparent_5px_10px)]" />
      </div>
      <div className="min-h-24 rounded-[0.22rem] bg-[#141820] p-2 text-[#aab0ba]">
        Traffic by source
        <i className="mx-auto my-2 block size-16 rounded-full bg-[conic-gradient(#63d0b2_0_43%,#386ac6_43%_65%,#5f536f_65%_78%,#252c38_78%)]" />
      </div>
    </div>
  </div>
);
export const NexoraListBoard = () => (
  <div className={`${board} min-h-[6.65rem] p-[0.7rem] text-[0.35rem]`}>
    <b>Projects</b>
    <span className="float-right text-[#9fa5b0]">⌕　⊕</span>
    <div className="my-[0.6rem] text-[#747b88]">Project　　　　　 Revenue　　　 Status</div>
    {['Website redesign', 'Mobile application', 'Design system'].map((item, index) => (
      <div
        className="flex items-center gap-[0.3rem] border-t border-[#1d222b] py-[0.28rem]"
        key={item}
      >
        <i className="text-[0.25rem] text-[#6c7eff]">●</i>
        {item}
        <small className="ml-auto text-[0.28rem] text-[#7db7a2]">
          {index === 1 ? 'In review' : 'In progress'}
        </small>
      </div>
    ))}
  </div>
);
export const NexoraMapBoard = () => (
  <div className={`${board} relative min-h-[6.65rem] p-[0.7rem] text-[0.35rem]`}>
    <b>Overview</b>
    <div className="absolute inset-[1.7rem_0.7rem_0.4rem] overflow-hidden text-[1.2rem] leading-none tracking-[0.7rem] text-[#1d2430]">
      ·　·　··　·
      <br />
      　··　　··　　·
      <br />
      ··　　····　　··
    </div>
  </div>
);
