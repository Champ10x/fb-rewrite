-- Who the content is for and the visual palette to match — used to steer
-- generated images toward the right audience and mood.
alter table brand_voices add column if not exists target_audience text;
alter table brand_voices add column if not exists color_theme text;
