import React from 'react';
import { Pagination } from '@mui/material';

const CustomPagination = ({ data, setPage }) => {
  return (
    <Pagination
      count={data?.totalPage}
      page={data?.currPage}
      onChange={(event, value) => setPage(value)}
      color=""
      sx={{
        '& .MuiPaginationItem-root': { color: 'white', borderColor: 'yellow' },
        '& .Mui-selected': {
          color: 'white',
          borderColor: 'white',
          bgcolor: '#dba207',
        },
        '& .MuiPaginationItem-previousNext': { color: 'white' },
      }}
      className="!text-white"
    />
  );
};

export default CustomPagination;
